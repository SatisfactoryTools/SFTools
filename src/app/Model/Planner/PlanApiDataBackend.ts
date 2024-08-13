import {concat, Observable, of, Subject, Subscription} from 'rxjs';
import {catchError, concatMap, debounceTime, map, tap, toArray} from 'rxjs/operators';
import {FoldersApiService} from '@src/Model/API/FoldersApiService';
import {PlansApiService} from '@src/Model/API/PlansApiService';
import {FolderTreeSchema} from '@src/Model/API/Schema/Plans/FolderTreeSchema';
import {PlanSchema} from '@src/Model/API/Schema/Plans/PlanSchema';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanStore} from '@src/Model/Planner/PlanStore';
import {NotificationService} from '@src/Model/NotificationService';
import {DataBackend} from '@src/Model/Sync/DataBackend';

export class PlanApiDataBackend implements DataBackend<PlanStore>
{

	private lastSynced: PlanStore = {folders: [], plans: []};
	/**
	 * Serialized plan data as of the last successful sync. Canvas gestures
	 * (node drags, edge corner edits) mutate the graph IN PLACE, so lastSynced
	 * aliases those changes and object comparison would miss them - only a
	 * string frozen at sync time detects them reliably.
	 */
	private readonly lastSyncedData = new Map<string, string>();
	private readonly lastSyncedFolderData = new Map<string, string>();
	/** Server revision counters for plans AND folders (UUIDs never collide). */
	private readonly serverRevisions = new Map<string, number>();
	private readonly saveSubject = new Subject<PlanStore>();
	private readonly subscription: Subscription;

	public constructor(
		private readonly plansApi: PlansApiService,
		private readonly foldersApi: FoldersApiService,
		private readonly versionManager: VersionManager,
		private readonly notifications: NotificationService,
	)
	{
		this.subscription = this.saveSubject.pipe(
			debounceTime(1000),
			concatMap(store => this.syncToApi(store).pipe(
				catchError(err => {
					console.error('Plan API sync failed:', err);
					this.notifications.show('Could not save to cloud. Your changes are saved locally.');
					return of(void 0);
				}),
			)),
		).subscribe();
	}

	public load(): Observable<PlanStore | null>
	{
		const versionId = this.versionManager.activeVersion()?.id;
		if (!versionId) {
			return of(null);
		}
		return this.plansApi.listPlans(versionId).pipe(
			map(response => {
				const folders: Folder[] = [];
				const plans: Plan[] = [];
				this.serverRevisions.clear();

				const processPlan = (schema: PlanSchema): void => {
					plans.push(this.hydratePlan(schema));
					this.serverRevisions.set(schema.id, schema.revision);
					(schema.subplans ?? []).forEach(processPlan);
				};

				const processFolder = (schema: FolderTreeSchema, parentId: string | null): void => {
					folders.push(this.hydrateFolder(schema, parentId));
					this.serverRevisions.set(schema.id, schema.revision);
					schema.plans.forEach(processPlan);
					schema.children.forEach(child => processFolder(child, schema.id));
				};

				response.folders.forEach(f => processFolder(f, null));
				response.plans.forEach(processPlan);

				const store: PlanStore = {folders, plans};
				this.lastSynced = store;
				this.lastSyncedData.clear();
				plans.forEach(p => this.lastSyncedData.set(p.id, this.serializePlanData(p)));
				this.lastSyncedFolderData.clear();
				folders.forEach(f => this.lastSyncedFolderData.set(f.id, this.serializeFolderData(f)));
				return store;
			}),
		);
	}

	public save(data: PlanStore): Observable<void>
	{
		this.saveSubject.next(data);
		return of(void 0);
	}

	public clear(): Observable<void>
	{
		return of(void 0);
	}

	private syncToApi(newStore: PlanStore): Observable<void>
	{
		// Every plan/folder route is version-scoped; without an active version
		// nothing can sync. lastSynced is left untouched so the diff retries.
		const versionId = this.versionManager.activeVersion()?.id;
		if (!versionId) {
			console.error('Cannot sync plans without an active version');
			return of(void 0);
		}

		const old = this.lastSynced;
		// Frozen now, compared against the last synced strings, and committed
		// as the new baseline once the sync succeeds.
		const serializedData = new Map(newStore.plans.map(p => [p.id, this.serializePlanData(p)]));
		const serializedFolderData = new Map(newStore.folders.map(f => [f.id, this.serializeFolderData(f)]));
		const oldFolderIds = new Set(old.folders.map(f => f.id));
		const newFolderIds = new Set(newStore.folders.map(f => f.id));
		const oldPlanIds = new Set(old.plans.map(p => p.id));

		const ops: Observable<unknown>[] = [];

		// New folders, sorted by depth so parents are created before children
		newStore.folders
			.filter(f => !oldFolderIds.has(f.id))
			.sort((a, b) => this.folderDepth(a.id, newStore.folders) - this.folderDepth(b.id, newStore.folders))
			.forEach(f => ops.push(
				this.foldersApi.createFolder(versionId, f.id, f.name, f.parentId, serializedFolderData.get(f.id)!)
					.pipe(tap(res => this.serverRevisions.set(f.id, res.revision))),
			));

		// Renamed, data-changed or moved folders
		newStore.folders.forEach(f => {
			if (!oldFolderIds.has(f.id)) return;
			const oldF = old.folders.find(x => x.id === f.id)!;

			const needsUpdate = oldF.name !== f.name
				|| serializedFolderData.get(f.id) !== this.lastSyncedFolderData.get(f.id);
			if (needsUpdate) {
				const revision = this.serverRevisions.get(f.id) ?? 0;
				ops.push(this.foldersApi.updateFolder(versionId, f.id, revision, {
					name: f.name,
					data: serializedFolderData.get(f.id)!,
				}).pipe(tap(res => this.serverRevisions.set(f.id, res.revision))));
			}
			if (oldF.parentId !== f.parentId) {
				ops.push(this.foldersApi.moveFolder(versionId, f.id, f.parentId));
			}
		});

		// Deleted folders - only top-level ones (server cascades to children)
		old.folders
			.filter(f => !newFolderIds.has(f.id))
			.filter(f => f.parentId === null || newFolderIds.has(f.parentId))
			.forEach(f => ops.push(this.foldersApi.deleteFolder(versionId, f.id).pipe(
				tap(() => {
					this.serverRevisions.delete(f.id);
					this.lastSyncedFolderData.delete(f.id);
				}),
			)));

		// New plans, sorted by subplan depth so parents are created before children
		newStore.plans
			.filter(p => !oldPlanIds.has(p.id))
			.sort((a, b) => this.planDepth(a.id, newStore.plans) - this.planDepth(b.id, newStore.plans))
			.forEach(p => ops.push(
				this.plansApi.createPlan(
					versionId, p.id, p.name, p.folderId, p.parentPlanId,
					serializedData.get(p.id)!,
					p.description || undefined,
				).pipe(tap(res => this.serverRevisions.set(p.id, res.revision))),
			));

		// Updated or moved plans
		newStore.plans
			.filter(p => oldPlanIds.has(p.id))
			.forEach(p => {
				const oldP = old.plans.find(x => x.id === p.id)!;

				const needsDataUpdate =
					oldP.name !== p.name ||
					oldP.description !== p.description ||
					serializedData.get(p.id) !== this.lastSyncedData.get(p.id);

				if (needsDataUpdate) {
					const revision = this.serverRevisions.get(p.id) ?? 0;
					ops.push(this.plansApi.updatePlan(versionId, p.id, revision, {
						name: p.name,
						description: p.description || null,
						data: serializedData.get(p.id)!,
					}).pipe(tap(res => this.serverRevisions.set(p.id, res.revision))));
				}

				if (oldP.folderId !== p.folderId || oldP.parentPlanId !== p.parentPlanId) {
					ops.push(p.parentPlanId !== null
						? this.plansApi.movePlanToParent(versionId, p.id, p.parentPlanId)
						: this.plansApi.movePlan(versionId, p.id, p.folderId));
				}
			});

		// Deleted plans - skip those covered by a folder or parent-plan cascade
		const newPlanIds = new Set(newStore.plans.map(p => p.id));
		old.plans
			.filter(p => !newPlanIds.has(p.id))
			.filter(p => !(p.folderId !== null && !newFolderIds.has(p.folderId)))
			.filter(p => !(p.parentPlanId !== null && !newPlanIds.has(p.parentPlanId)))
			.forEach(p => ops.push(this.plansApi.deletePlan(versionId, p.id).pipe(
				tap(() => {
					this.serverRevisions.delete(p.id);
					this.lastSyncedData.delete(p.id);
				}),
			)));

		if (ops.length === 0) {
			this.lastSynced = newStore;
			return of(void 0);
		}

		return concat(...ops).pipe(
			toArray(),
			tap(() => {
				this.lastSynced = newStore;
				serializedData.forEach((data, id) => this.lastSyncedData.set(id, data));
				serializedFolderData.forEach((data, id) => this.lastSyncedFolderData.set(id, data));
			}),
			map(() => void 0),
		);
	}

	private hydrateFolder(schema: FolderTreeSchema, parentId: string | null): Folder
	{
		let data: {settings?: Folder['settings']} = {};
		try {
			data = JSON.parse(schema.data) as typeof data;
		} catch {
			// malformed data - treat as inheriting
		}
		return {
			id: schema.id,
			name: schema.name,
			parentId,
			settings: data.settings ?? null,
			revision: schema.revision,
		};
	}

	/** The "settings" key namespaces the payload so more keys can join later. */
	private serializeFolderData(folder: Folder): string
	{
		return JSON.stringify({settings: folder.settings ?? undefined});
	}

	private hydratePlan(schema: PlanSchema): Plan
	{
		let data: {settings?: Plan['settings']; requests?: Plan['requests']; inputs?: Plan['inputs']; graph?: Plan['graph']; metadata?: Plan['metadata']; iconClassName?: Plan['iconClassName']} = {};
		try {
			data = JSON.parse(schema.data) as typeof data;
		} catch {
			// malformed data - use defaults
		}

		return {
			id: schema.id,
			name: schema.name,
			description: schema.description ?? '',
			folderId: schema.folder,
			parentPlanId: schema.parent,
			// Fallback covers plans saved before calculationMode existed.
			settings: {
				calculationMode: data.settings?.calculationMode ?? 'automatic',
				graph: data.settings?.graph,
				enabledRecipes: data.settings?.enabledRecipes,
				resourceLimits: data.settings?.resourceLimits,
				enabledFuels: data.settings?.enabledFuels,
				sinkableItems: data.settings?.sinkableItems,
				producePowerForFactory: data.settings?.producePowerForFactory,
				excessPowerPercent: data.settings?.excessPowerPercent,
				optimisation: data.settings?.optimisation,
				maxSloops: data.settings?.maxSloops,
				sloopAccuracy: data.settings?.sloopAccuracy,
			},
			requests: data.requests ?? [],
			inputs: data.inputs ?? [],
			graph: data.graph ?? null,
			// Fallback covers plans saved before metadata existed.
			metadata: {graphDirty: data.metadata?.graphDirty ?? false},
			iconClassName: data.iconClassName,
			revision: schema.revision,
		};
	}

	private serializePlanData(plan: Plan): string
	{
		return JSON.stringify({
			settings: plan.settings,
			requests: plan.requests,
			inputs: plan.inputs,
			graph: plan.graph,
			metadata: plan.metadata,
			iconClassName: plan.iconClassName,
		});
	}

	private folderDepth(id: string, folders: Folder[]): number
	{
		const folder = folders.find(f => f.id === id);
		if (!folder || folder.parentId === null) return 0;
		return 1 + this.folderDepth(folder.parentId, folders);
	}

	private planDepth(id: string, plans: Plan[]): number
	{
		const plan = plans.find(p => p.id === id);
		if (!plan || plan.parentPlanId === null) return 0;
		return 1 + this.planDepth(plan.parentPlanId, plans);
	}

}
