import {Injectable, Signal, computed, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {distinctUntilChanged, map, skip} from 'rxjs';
import {AuthService} from '@src/Model/Auth/AuthService';
import {FoldersApiService} from '@src/Model/API/FoldersApiService';
import {PlansApiService} from '@src/Model/API/PlansApiService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {LocalStorageDataBackend} from '@src/Model/Sync/LocalStorageDataBackend';
import {SyncableService} from '@src/Model/Sync/SyncableService';
import {UseLocalConflictResolver} from '@src/Model/Sync/UseLocalConflictResolver';
import {Folder} from '@src/Model/Planner/Folder';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanApiDataBackend} from '@src/Model/Planner/PlanApiDataBackend';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {PlanStore} from '@src/Model/Planner/PlanStore';
import {PlanTree} from '@src/Model/Planner/PlanTree';
import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';
import {PlanInput} from '@src/Model/Planner/PlanInput';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {ProductionRequest} from '@src/Model/Planner/ProductionRequest';

const EMPTY_STORE: PlanStore = {folders: [], plans: []};

@Injectable({providedIn: 'root'})
export class PlanManager extends SyncableService<PlanStore>
{

	private readonly activePlanIdSignal = signal<string | null>(null);
	public readonly activePlanId: Signal<string | null> = this.activePlanIdSignal.asReadonly();

	/** Selecting a folder deselects the plan and vice versa - at most one is active. */
	private readonly activeFolderIdSignal = signal<string | null>(null);
	public readonly activeFolderId: Signal<string | null> = this.activeFolderIdSignal.asReadonly();

	public readonly plans: Signal<Plan[]> = computed(() => this.data().plans);
	public readonly folders: Signal<Folder[]> = computed(() => this.data().folders);

	public readonly activePlan: Signal<Plan | null> = computed(() =>
		this.plans().find(p => p.id === this.activePlanId()) ?? null,
	);

	public readonly activeFolder: Signal<Folder | null> = computed(() =>
		this.folders().find(f => f.id === this.activeFolderId()) ?? null,
	);

	/**
	 * The settings the calculator edits: the active plan's, or the active
	 * folder's custom ones. Null while a folder without custom settings is
	 * active (it inherits - enable custom settings to edit).
	 */
	public readonly activeSettings: Signal<PlanSettings | null> = computed(() => {
		const plan = this.activePlan();
		if (plan) {
			return plan.settings;
		}
		return this.activeFolder()?.settings ?? null;
	});

	/** Optional chaining covers plans persisted before metadata existed. */
	public readonly activePlanGraphDirty: Signal<boolean> = computed(() =>
		this.activePlan()?.metadata?.graphDirty ?? false,
	);

	public readonly planTree: Signal<PlanTree> = computed(() => this.buildTree(this.data()));

	// While signed in, the localStorage plans stay put and surface here so the
	// user can migrate them into their account by drag and drop.
	private readonly localStoreSignal = signal<PlanStore>(EMPTY_STORE);
	public readonly localPlanTree: Signal<PlanTree> = computed(() => this.buildTree(this.localStoreSignal()));
	public readonly isAuthenticated: Signal<boolean> = computed(() => this.authService.isAuthenticated());

	private readonly localPlanBackend: LocalStorageDataBackend<PlanStore>;

	public constructor(
		authService: AuthService,
		plansApiService: PlansApiService,
		foldersApiService: FoldersApiService,
		private readonly versionManager: VersionManager,
		notifications: NotificationService,
	)
	{
		const localBackend = new LocalStorageDataBackend<PlanStore>('sftools.plans');
		super(
			authService,
			localBackend,
			new PlanApiDataBackend(plansApiService, foldersApiService, versionManager, notifications),
			new UseLocalConflictResolver<PlanStore>(),
			EMPTY_STORE,
		);
		this.localPlanBackend = localBackend;
		if (authService.isAuthenticated()) {
			this.refreshLocalStore();
		}

		// Plans are version-scoped on the API; switching the active game
		// version means a different plan collection, so re-fetch and drop the
		// now-foreign active plan. (Root singleton - no teardown needed.)
		toObservable(versionManager.activeVersion).pipe(
			map(version => version?.id ?? null),
			distinctUntilChanged(),
			skip(1),
		).subscribe(() => {
			this.activePlanIdSignal.set(null);
			this.activeFolderIdSignal.set(null);
			this.reload();
		});
	}

	/**
	 * On login the account's plans become active, but - unlike the default
	 * merge - the local plans are kept intact and surfaced separately so the
	 * user can migrate them by hand.
	 */
	protected override onLogin(): void
	{
		if (this.remoteBackend) {
			this.setActiveBackend(this.remoteBackend);
			this.loadFrom(this.remoteBackend);
		}
		this.refreshLocalStore();
	}

	/** On logout the local plans become the active store again, untouched. */
	protected override onLogout(): void
	{
		this.activePlanIdSignal.set(null);
		this.activeFolderIdSignal.set(null);
		this.setActiveBackend(this.localBackend);
		this.loadFrom(this.localBackend);
		this.localStoreSignal.set(EMPTY_STORE);
	}

	private refreshLocalStore(): void
	{
		this.localPlanBackend.load().subscribe(store => this.localStoreSignal.set(store ?? EMPTY_STORE));
	}

	/** Appends already-hydrated folders/plans (e.g. a copied share) to the store. */
	public importTree(folders: Folder[], plans: Plan[]): void
	{
		this.mutate(store => ({
			folders: [...store.folders, ...folders],
			plans: [...store.plans, ...plans],
		}));
	}

	/** Moves a local plan/folder (with its whole subtree) into the account. */
	public moveLocalToAccount(id: string, type: 'plan' | 'folder'): void
	{
		const {moved, rest} = this.extractSubtree(this.localStoreSignal(), id, type);
		this.localStoreSignal.set(rest);
		this.localPlanBackend.save(rest).subscribe();
		const current = this.data();
		this.persist({folders: [...current.folders, ...moved.folders], plans: [...current.plans, ...moved.plans]});
	}

	/** Moves an account plan/folder (with its whole subtree) back to this device. */
	public moveAccountToLocal(id: string, type: 'plan' | 'folder'): void
	{
		const {moved, rest} = this.extractSubtree(this.data(), id, type);
		if (this.activePlanId() !== null && moved.plans.some(p => p.id === this.activePlanId())) {
			this.activePlanIdSignal.set(null);
		}
		if (this.activeFolderId() !== null && moved.folders.some(f => f.id === this.activeFolderId())) {
			this.activeFolderIdSignal.set(null);
		}
		this.persist(rest);
		const local = this.localStoreSignal();
		const merged: PlanStore = {folders: [...local.folders, ...moved.folders], plans: [...local.plans, ...moved.plans]};
		this.localStoreSignal.set(merged);
		this.localPlanBackend.save(merged).subscribe();
	}

	/**
	 * Splits a store into the subtree rooted at `id` (detached to the root) and
	 * the remainder. A folder carries its descendant folders and every plan in
	 * them; a plan carries its subplans.
	 */
	private extractSubtree(store: PlanStore, id: string, type: 'plan' | 'folder'): {moved: PlanStore; rest: PlanStore}
	{
		const folderIds = new Set<string>();
		const planIds = new Set<string>();

		if (type === 'folder') {
			folderIds.add(id);
			this.collectDescendantIds(id, store.folders).forEach(fid => folderIds.add(fid));
			store.plans
				.filter(p => p.folderId !== null && folderIds.has(p.folderId))
				.forEach(p => {
					planIds.add(p.id);
					this.collectDescendantPlanIds(p.id, store.plans).forEach(sp => planIds.add(sp));
				});
		} else {
			planIds.add(id);
			this.collectDescendantPlanIds(id, store.plans).forEach(sp => planIds.add(sp));
		}

		const movedFolders = store.folders
			.filter(f => folderIds.has(f.id))
			.map(f => f.id === id ? {...f, parentId: null} : f);
		const movedPlans = store.plans
			.filter(p => planIds.has(p.id))
			.map(p => p.id === id ? {...p, folderId: null, parentPlanId: null} : p);

		return {
			moved: {folders: movedFolders, plans: movedPlans},
			rest: {
				folders: store.folders.filter(f => !folderIds.has(f.id)),
				plans: store.plans.filter(p => !planIds.has(p.id)),
			},
		};
	}

	public createFolder(name: string, parentId: string | null = null): Folder
	{
		const folder: Folder = {id: crypto.randomUUID(), name, parentId, settings: null, revision: null};
		this.mutate(store => ({...store, folders: [...store.folders, folder]}));
		return folder;
	}

	public renameFolder(id: string, name: string): void
	{
		this.mutate(store => ({
			...store,
			folders: store.folders.map(f => f.id === id ? {...f, name} : f),
		}));
	}

	public deleteFolder(id: string): void
	{
		const store = this.data();
		const deletedIds = new Set([id, ...this.collectDescendantIds(id, store.folders)]);

		const directPlanIds = store.plans
			.filter(p => p.folderId !== null && deletedIds.has(p.folderId))
			.map(p => p.id);
		const deletedPlanIds = new Set(
			directPlanIds.flatMap(planId => [planId, ...this.collectDescendantPlanIds(planId, store.plans)]),
		);

		this.mutate(() => ({
			folders: store.folders.filter(f => !deletedIds.has(f.id)),
			plans: store.plans.filter(p => !deletedPlanIds.has(p.id)),
		}));

		if (this.activePlanId() !== null && deletedPlanIds.has(this.activePlanId()!)) {
			this.activePlanIdSignal.set(null);
		}
		if (this.activeFolderId() !== null && deletedIds.has(this.activeFolderId()!)) {
			this.activeFolderIdSignal.set(null);
		}
	}

	/** New plans start from the folder chain's effective default settings. */
	/** A blank name is the default; the shown name is derived from the plan's products (see PlanNameResolver). */
	public createPlan(name: string = '', folderId: string | null = null): Plan
	{
		return this.insertPlan(name, folderId, null, this.effectiveFolderSettings(folderId));
	}

	/**
	 * A subplan starts with its parent's graph layout settings, recipe
	 * selection and raw-resource limits (folders will join the cascade later).
	 */
	public createSubplan(name: string, parentPlanId: string): Plan
	{
		const parent = this.data().plans.find(p => p.id === parentPlanId);
		const settings: PlanSettings = {
			...this.defaultSettings(),
			graph: parent?.settings.graph ? {...parent.settings.graph} : undefined,
			enabledRecipes: parent?.settings.enabledRecipes ? [...parent.settings.enabledRecipes] : undefined,
			resourceLimits: parent?.settings.resourceLimits ? {...parent.settings.resourceLimits} : undefined,
			enabledFuels: parent?.settings.enabledFuels
				? Object.fromEntries(Object.entries(parent.settings.enabledFuels).map(([gen, fuels]) => [gen, [...fuels]]))
				: undefined,
		};
		return this.insertPlan(name, null, parentPlanId, settings);
	}

	public loadPlan(plan: Plan): void
	{
		this.mutate(store => {
			const exists = store.plans.some(p => p.id === plan.id);
			return {
				...store,
				plans: exists ? store.plans.map(p => p.id === plan.id ? plan : p) : [...store.plans, plan],
			};
		});
		this.setActivePlan(plan.id);
	}

	public setActivePlan(id: string): void
	{
		this.activePlanIdSignal.set(id);
		this.activeFolderIdSignal.set(null);
	}

	public setActiveFolder(id: string | null): void
	{
		this.activeFolderIdSignal.set(id);
		this.activePlanIdSignal.set(null);
	}

	public updatePlan(updated: Plan): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === updated.id ? updated : p),
		}));
	}

	public setSettings(planId: string, settings: PlanSettings): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p, settings} : p),
		}));
	}

	/** Null removes the folder's custom settings - it inherits from its parent again. */
	public setFolderSettings(folderId: string, settings: PlanSettings | null): void
	{
		this.mutate(store => ({
			...store,
			folders: store.folders.map(f => f.id === folderId ? {...f, settings} : f),
		}));
	}

	/** Routes a settings edit to whatever the calculator is editing (see activeSettings). */
	public updateActiveSettings(settings: PlanSettings): void
	{
		const plan = this.activePlan();
		if (plan) {
			this.setSettings(plan.id, settings);
			return;
		}
		const folder = this.activeFolder();
		if (folder && folder.settings) {
			this.setFolderSettings(folder.id, settings);
		}
	}

	/**
	 * Effective default settings for the given folder chain: the nearest
	 * ancestor folder with custom settings wins; the root falls back to the
	 * plain defaults (a per-version global default may replace that later).
	 * Always returns a fresh copy safe to assign to a plan or folder.
	 */
	public effectiveFolderSettings(folderId: string | null): PlanSettings
	{
		const folders = this.folders();
		const seen = new Set<string>();
		let id = folderId;
		while (id !== null && !seen.has(id)) {
			seen.add(id);
			const folder = folders.find(f => f.id === id);
			if (!folder) {
				break;
			}
			if (folder.settings) {
				return this.cloneSettings(folder.settings);
			}
			id = folder.parentId;
		}
		return this.defaultSettings();
	}

	public cloneSettings(settings: PlanSettings): PlanSettings
	{
		return {
			calculationMode: settings.calculationMode ?? 'automatic',
			graph: settings.graph ? {...settings.graph} : undefined,
			enabledRecipes: settings.enabledRecipes ? [...settings.enabledRecipes] : undefined,
			resourceLimits: settings.resourceLimits ? {...settings.resourceLimits} : undefined,
			enabledFuels: settings.enabledFuels
				? Object.fromEntries(Object.entries(settings.enabledFuels).map(([generator, fuels]) => [generator, [...fuels]]))
				: undefined,
			sinkableItems: settings.sinkableItems ? [...settings.sinkableItems] : undefined,
			producePowerForFactory: settings.producePowerForFactory,
			excessPowerPercent: settings.excessPowerPercent,
			optimisation: settings.optimisation
				? {
					...settings.optimisation,
					resourceWeights: settings.optimisation.resourceWeights ? {...settings.optimisation.resourceWeights} : undefined,
				}
				: undefined,
			defaultClockSpeed: settings.defaultClockSpeed,
			recipeClockSpeeds: settings.recipeClockSpeeds ? settings.recipeClockSpeeds.map(entry => ({...entry})) : undefined,
			maxSloops: settings.maxSloops,
			sloopAccuracy: settings.sloopAccuracy,
		};
	}

	public setRequests(planId: string, requests: ProductionRequest[]): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p, requests: [...requests]} : p),
		}));
	}

	public setInputs(planId: string, inputs: PlanInput[]): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p, inputs: [...inputs]} : p),
		}));
	}

	/** Omitting graphDirty keeps the plan's current dirty state (e.g. graph revival on load). */
	public setGraph(planId: string, graph: Graph | null, graphDirty?: boolean): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId
				? {...p, graph, metadata: graphDirty === undefined ? p.metadata : {...p.metadata, graphDirty}}
				: p),
		}));
	}

	public setGraphDirty(planId: string, graphDirty: boolean): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p, metadata: {...p.metadata, graphDirty}} : p),
		}));
	}

	/**
	 * Persists in-place graph mutations (node drags, edge corner edits): the
	 * canvas edits the graph's nodes and edges by reference, so re-saving the
	 * store - with a fresh plan identity for signal consumers - is enough.
	 */
	public touchGraph(planId: string): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p} : p),
		}));
	}

	public deletePlan(id: string): void
	{
		const store = this.data();
		const deletedIds = new Set([id, ...this.collectDescendantPlanIds(id, store.plans)]);
		this.mutate(s => ({...s, plans: s.plans.filter(p => !deletedIds.has(p.id))}));
		if (this.activePlanIdSignal() !== null && deletedIds.has(this.activePlanIdSignal()!)) {
			this.activePlanIdSignal.set(null);
		}
	}

	public renamePlan(id: string, name: string): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === id ? {...p, name} : p),
		}));
	}

	/** Sets (or clears, with null) a plan's icon override. */
	public setPlanIcon(id: string, iconClassName: string | null): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === id ? {...p, iconClassName} : p),
		}));
	}

	/** Makes the plan top-level, placed in the given folder (null for root). */
	public movePlan(planId: string, folderId: string | null): void
	{
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p, folderId, parentPlanId: null} : p),
		}));
	}

	public moveFolder(folderId: string, newParentId: string | null): void
	{
		const store = this.data();
		const descendantIds = this.collectDescendantIds(folderId, store.folders);
		if (newParentId !== null && (newParentId === folderId || descendantIds.includes(newParentId))) {
			return; // would create a cycle
		}
		this.mutate(s => ({
			...s,
			folders: s.folders.map(f => f.id === folderId ? {...f, parentId: newParentId} : f),
		}));
	}

	private mutate(updater: (store: PlanStore) => PlanStore): void
	{
		this.persist(updater(this.data()));
	}

	private buildTree(store: PlanStore): PlanTree
	{
		const byName = (a: {name: string}, b: {name: string}): number => a.name.localeCompare(b.name);
		const byPlanName = (a: Plan, b: Plan): number => a.name.localeCompare(b.name);

		const buildPlan = (plan: Plan): PlanTreePlan => ({
			plan,
			subplans: store.plans
				.filter(p => p.parentPlanId === plan.id)
				.sort(byPlanName)
				.map(buildPlan),
		});

		const buildFolder = (folderId: string): PlanTreeFolder => {
			const folder = store.folders.find(f => f.id === folderId)!;
			const children = store.folders
				.filter(f => f.parentId === folderId)
				.sort(byName)
				.map(f => buildFolder(f.id));
			const plans = store.plans
				.filter(p => p.folderId === folderId && p.parentPlanId === null)
				.sort(byPlanName)
				.map(buildPlan);
			return {folder, children, plans};
		};

		return {
			rootFolders: store.folders
				.filter(f => f.parentId === null)
				.sort(byName)
				.map(f => buildFolder(f.id)),
			rootPlans: store.plans
				.filter(p => p.folderId === null && p.parentPlanId === null)
				.sort(byPlanName)
				.map(buildPlan),
		};
	}

	private collectDescendantIds(folderId: string, folders: Folder[]): string[]
	{
		const direct = folders.filter(f => f.parentId === folderId).map(f => f.id);
		return direct.flatMap(id => [id, ...this.collectDescendantIds(id, folders)]);
	}

	private collectDescendantPlanIds(planId: string, plans: Plan[]): string[]
	{
		const direct = plans.filter(p => p.parentPlanId === planId).map(p => p.id);
		return direct.flatMap(id => [id, ...this.collectDescendantPlanIds(id, plans)]);
	}

	private insertPlan(name: string, folderId: string | null, parentPlanId: string | null, settings: PlanSettings): Plan
	{
		const plan: Plan = {
			id: crypto.randomUUID(),
			name,
			description: '',
			folderId,
			parentPlanId,
			settings,
			requests: [],
			inputs: [],
			graph: null,
			metadata: {graphDirty: false},
			revision: null,
			// iconClassName left undefined: "not chosen yet" (see Plan).
		};
		this.mutate(store => ({...store, plans: [...store.plans, plan]}));
		return plan;
	}

	public defaultSettings(): PlanSettings
	{
		// Versions with world data carry derived per-minute resource caps -
		// plans in such a version start limited to what its map can supply.
		// Water stays unlimited: its extractors need no node.
		const worldLimits = this.versionManager.activeVersionData()?.worldLimits ?? null;
		if (worldLimits === null) {
			return {calculationMode: 'automatic'};
		}
		const limits = {...worldLimits};
		delete limits[SpecialClasses.WaterItem];
		return {
			calculationMode: 'automatic',
			...(Object.keys(limits).length > 0 ? {resourceLimits: limits} : {}),
		};
	}

}
