import {Injectable, Signal, computed, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Observable, Subject, distinctUntilChanged, map, skip} from 'rxjs';
import {AuthService} from '@src/Model/Auth/AuthService';
import {FoldersApiService} from '@src/Model/API/FoldersApiService';
import {PlansApiService} from '@src/Model/API/PlansApiService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {SyncableService} from '@src/Model/Sync/SyncableService';
import {UseLocalConflictResolver} from '@src/Model/Sync/UseLocalConflictResolver';
import {Folder} from '@src/Model/Planner/Folder';
import {FolderGroupMode} from '@src/Model/Planner/FolderGroupMode';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {LocalPlanStoreBackend} from '@src/Model/Planner/LocalPlanStoreBackend';
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
import {SettingsGroup} from '@src/Model/Planner/SettingsGroup';
import {SettingsGroups} from '@src/Model/Planner/SettingsGroups';

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

	/**
	 * Read-only plans of the currently open share. Deliberately a SEPARATE
	 * signal, never merged into the synced store: the sync backends only ever
	 * see data(), so shared plans are structurally unsyncable. Every mutator
	 * below additionally guards against shared ids as defense in depth.
	 */
	private readonly sharedStoreSignal = signal<PlanStore>(EMPTY_STORE);
	public readonly sharedPlans: Signal<Plan[]> = computed(() => this.sharedStoreSignal().plans);

	public readonly activePlan: Signal<Plan | null> = computed(() =>
		this.plans().find(p => p.id === this.activePlanId())
		?? this.sharedPlans().find(p => p.id === this.activePlanId())
		?? null,
	);

	/** True while the active plan is a read-only shared one - the planner's read-only mode switch. */
	public readonly activePlanShared: Signal<boolean> = computed(() => {
		const id = this.activePlanId();
		return id !== null && this.sharedPlans().some(p => p.id === id);
	});

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

	private readonly localPlanBackend: LocalPlanStoreBackend;

	/**
	 * Plan ids whose stored graphs just lost subplan nodes because the
	 * referenced subplan was deleted - the planner re-renders the canvas when
	 * the active plan is among them.
	 */
	private readonly scrubbedGraphsSubject = new Subject<string[]>();
	public readonly scrubbedGraphs: Observable<string[]> = this.scrubbedGraphsSubject.asObservable();

	public constructor(
		authService: AuthService,
		plansApiService: PlansApiService,
		foldersApiService: FoldersApiService,
		private readonly versionManager: VersionManager,
		notifications: NotificationService,
	)
	{
		const localBackend = new LocalPlanStoreBackend('sftools.plans');
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
		// now-foreign active plan. A shared plan survives: opening a share
		// activates its version, and the (async) emission here must not wipe
		// the selection the share flow just made. (Root singleton - no
		// teardown needed.)
		toObservable(versionManager.activeVersion).pipe(
			map(version => version?.id ?? null),
			distinctUntilChanged(),
			skip(1),
		).subscribe(() => {
			if (!this.activePlanShared()) {
				this.activePlanIdSignal.set(null);
				this.activeFolderIdSignal.set(null);
			}
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

	/** True when the id belongs to a plan of the currently open share (read-only). */
	public isSharedPlan(id: string): boolean
	{
		return this.sharedPlans().some(p => p.id === id);
	}

	/** Loads an opened share's hydrated tree into the separate read-only store. */
	public loadSharedStore(folders: Folder[], plans: Plan[]): void
	{
		this.sharedStoreSignal.set({folders, plans});
	}

	public clearSharedStore(): void
	{
		if (this.activePlanShared()) {
			this.activePlanIdSignal.set(null);
		}
		this.sharedStoreSignal.set(EMPTY_STORE);
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
		const folder: Folder = {
			id: crypto.randomUUID(),
			name,
			parentId,
			settings: null,
			fixedGroups: [],
			resourcePool: false,
			order: this.nextOrder(this.data().folders.filter(f => f.parentId === parentId)),
			revision: null,
		};
		this.mutate(store => ({...store, folders: [...store.folders, folder]}));
		return folder;
	}

	/**
	 * Deep-copies the folder - subfolders, plans and subplans included - next
	 * to the original as "Clone: [name]" (only the root is renamed). Every
	 * copy gets a fresh id and no revision, so the API sees brand-new entities.
	 */
	public cloneFolder(id: string): Folder | null
	{
		const store = this.data();
		const original = store.folders.find(f => f.id === id);
		if (!original) {
			return null;
		}
		const {moved} = this.extractSubtree(store, id, 'folder');
		const copy = this.copyTree(moved.folders.map(f => f.id === id ? original : f), moved.plans);
		const root: Folder = {
			...copy.folders.find(f => f.id === copy.idMap.get(id))!,
			name: `Clone: ${original.name}`,
			order: this.nextOrder(this.orderedFolders(store, original.parentId)),
		};
		this.mutate(s => ({
			folders: [...s.folders, ...copy.folders.map(f => f.id === root.id ? root : f)],
			plans: [...s.plans, ...copy.plans],
		}));
		return root;
	}

	/**
	 * Deep-copies a top-level plan with its subplans next to the original as
	 * "Clone: [name]" (`name` is the shown name - the stored one may be blank).
	 * Subplan nodes in the copied graphs point at the copied subplans. Every
	 * copy gets a fresh id and no revision, so the API sees brand-new plans.
	 */
	public clonePlan(id: string, name: string): Plan | null
	{
		if (this.isSharedPlan(id)) return null;
		const store = this.data();
		const original = store.plans.find(p => p.id === id);
		if (!original || original.parentPlanId !== null) {
			return null;
		}
		const {moved} = this.extractSubtree(store, id, 'plan');
		const copy = this.copyTree([], moved.plans.map(p => p.id === id ? original : p));
		const root: Plan = {
			...copy.plans.find(p => p.id === copy.idMap.get(id))!,
			name: `Clone: ${name}`,
			order: this.nextOrder(this.orderedPlans(store, original.folderId, null)),
		};
		this.mutate(s => ({
			...s,
			plans: [...s.plans, ...copy.plans.map(p => p.id === root.id ? root : p)],
		}));
		return root;
	}

	/**
	 * Fresh-id deep copies of the given folders and plans. References among
	 * them (parent folder, folder, parent plan, graph subplan nodes) follow
	 * the new ids; references to anything outside the set stay as they are.
	 */
	private copyTree(folders: readonly Folder[], plans: readonly Plan[]): {folders: Folder[]; plans: Plan[]; idMap: Map<string, string>}
	{
		const idMap = new Map<string, string>();
		folders.forEach(f => idMap.set(f.id, crypto.randomUUID()));
		plans.forEach(p => idMap.set(p.id, crypto.randomUUID()));
		const remap = (ref: string | null): string | null => ref === null ? null : idMap.get(ref) ?? ref;
		return {
			idMap,
			folders: folders.map(f => ({
				...f,
				id: idMap.get(f.id)!,
				parentId: remap(f.parentId),
				settings: f.settings ? this.cloneSettings(f.settings) : null,
				fixedGroups: [...f.fixedGroups],
				revision: null,
			})),
			plans: plans.map(p => ({
				...p,
				id: idMap.get(p.id)!,
				folderId: remap(p.folderId),
				parentPlanId: remap(p.parentPlanId),
				settings: this.cloneSettings(p.settings),
				requests: structuredClone(p.requests),
				inputs: structuredClone(p.inputs),
				graph: this.copyGraph(p.graph, idMap),
				metadata: structuredClone(p.metadata),
				revision: null,
			})),
		};
	}

	/**
	 * A raw-JSON copy of the graph (through Node.toJSON - the planner revives
	 * it on demand, like a graph loaded from the API) with subplan nodes
	 * pointed at the copied subplans.
	 */
	private copyGraph(graph: Graph | null, idMap: Map<string, string>): Graph | null
	{
		if (graph === null) {
			return null;
		}
		const raw = JSON.parse(JSON.stringify(graph)) as Graph;
		return {
			...raw,
			nodes: raw.nodes.map(node => {
				const subplanId = (node as unknown as {subplanId?: string}).subplanId;
				return typeof subplanId === 'string' && idMap.has(subplanId)
					? {...node, subplanId: idMap.get(subplanId)!} as unknown as typeof node
					: node;
			}),
		};
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

		const scrubbed = this.scrubSubplanNodes(store.plans.filter(p => !deletedPlanIds.has(p.id)), deletedPlanIds);

		this.mutate(() => ({
			folders: store.folders.filter(f => !deletedIds.has(f.id)),
			plans: scrubbed.plans,
		}));

		if (this.activePlanId() !== null && deletedPlanIds.has(this.activePlanId()!)) {
			this.activePlanIdSignal.set(null);
		}
		if (this.activeFolderId() !== null && deletedIds.has(this.activeFolderId()!)) {
			this.activeFolderIdSignal.set(null);
		}
		this.notifyScrubbed(scrubbed.scrubbedIds);
	}

	/** New plans start from the folder chain's effective default settings. */
	/** A blank name is the default; the shown name is derived from the plan's products (see PlanNameResolver). */
	public createPlan(name: string = '', folderId: string | null = null): Plan
	{
		return this.insertPlan(name, folderId, null, this.effectiveFolderSettings(folderId));
	}

	/** Nearest folder on the chain (self included) that fixes settings groups; null when none. */
	public fixedFolderForFolder(folderId: string | null): Folder | null
	{
		return this.fixedFolderForFolderIn(this.folders(), folderId);
	}

	/** The folder fixing this plan's settings groups (through subplan parents and nested folders), or null. */
	public fixedFolderOf(plan: Plan): Folder | null
	{
		return this.fixedFolderForFolder(this.topLevelFolderIdOf(plan, this.plans()));
	}

	public fixedGroupsOf(plan: Plan): readonly SettingsGroup[]
	{
		return this.fixedFolderOf(plan)?.fixedGroups ?? [];
	}

	/** The folder pooling this plan's raw resources, or null. */
	public poolFolderOf(plan: Plan): Folder | null
	{
		const folder = this.fixedFolderOf(plan);
		return folder !== null && folder.resourcePool && folder.fixedGroups.includes('resources') ? folder : null;
	}

	public folderGroupMode(folder: Folder, group: SettingsGroup): FolderGroupMode
	{
		if (!folder.fixedGroups.includes(group)) {
			return 'default';
		}
		return group === 'resources' && folder.resourcePool ? 'pool' : 'fixed';
	}

	/**
	 * Why the folder cannot fix settings groups right now, or null when it
	 * can: a folder with fixed groups may not contain another folder with
	 * custom settings (nested defaults would silently lose to the fixed values).
	 */
	public fixGroupsBlocker(folderId: string): string | null
	{
		const folders = this.folders();
		const custom = this.collectDescendantIds(folderId, folders)
			.map(id => folders.find(f => f.id === id))
			.filter((f): f is Folder => f !== undefined && f.settings !== null);
		if (custom.length > 0) {
			return `Remove the custom settings of ${custom.map(f => `"${f.name}"`).join(', ')} first - `
				+ 'a folder that fixes settings cannot contain folders with their own settings.';
		}
		return null;
	}

	/** Why the folder cannot get custom settings, or null when it can (an ancestor fixes settings). */
	public customSettingsBlocker(folderId: string): string | null
	{
		const folder = this.folders().find(f => f.id === folderId);
		const fixed = this.fixedFolderForFolder(folder?.parentId ?? null);
		return fixed ? `"${fixed.name}" fixes settings for everything inside it - this folder cannot have its own.` : null;
	}

	/**
	 * Every plan inside the folder, nested plain folders and subplans
	 * included, in tree order: subfolders first, then plans, each plan
	 * followed by its subplans. This is also the batch recalculation order.
	 */
	public innerPlans(folderId: string): Plan[]
	{
		const tree = this.planTree();
		const findFolder = (nodes: PlanTreeFolder[]): PlanTreeFolder | null => {
			for (const node of nodes) {
				if (node.folder.id === folderId) {
					return node;
				}
				const nested = findFolder(node.children);
				if (nested) {
					return nested;
				}
			}
			return null;
		};
		const result: Plan[] = [];
		const addPlan = (node: PlanTreePlan): void => {
			result.push(node.plan);
			node.subplans.forEach(addPlan);
		};
		const addFolder = (node: PlanTreeFolder): void => {
			node.children.forEach(addFolder);
			node.plans.forEach(addPlan);
		};
		const root = findFolder(tree.rootFolders);
		if (root) {
			addFolder(root);
		}
		return result;
	}

	/**
	 * Switches one settings group of the folder between default, fixed and
	 * (resources only) pooled; fixing pushes the folder's values into every
	 * inner plan. Confirming the overwrite is the caller's job.
	 */
	public setFolderGroupMode(folderId: string, group: SettingsGroup, mode: FolderGroupMode): void
	{
		this.mutate(store => {
			const folder = store.folders.find(f => f.id === folderId);
			if (!folder || folder.settings === null) {
				return store;
			}
			const fixedGroups = mode === 'default'
				? folder.fixedGroups.filter(g => g !== group)
				: folder.fixedGroups.includes(group) ? folder.fixedGroups : [...folder.fixedGroups, group];
			const resourcePool = group === 'resources' ? mode === 'pool' : folder.resourcePool;
			const updated: Folder = {...folder, fixedGroups, resourcePool};
			const next = {...store, folders: store.folders.map(f => f.id === folderId ? updated : f)};
			return this.pushFixedSettings(next, updated, null);
		});
	}

	public setRecalculationNeeded(planIds: readonly string[], recalculationNeeded: boolean): void
	{
		const ids = new Set(planIds);
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => ids.has(p.id) && (p.metadata.recalculationNeeded ?? false) !== recalculationNeeded
				? {...p, metadata: {...p.metadata, recalculationNeeded: recalculationNeeded || undefined}}
				: p),
		}));
	}

	/**
	 * Copies the folder's fixed groups into its inner plans (all of them, or
	 * just `onlyPlanIds`). A plan whose values actually change and that has a
	 * graph is flagged for recalculation - its graph no longer matches.
	 */
	private pushFixedSettings(store: PlanStore, folder: Folder, onlyPlanIds: ReadonlySet<string> | null): PlanStore
	{
		if (folder.settings === null || folder.fixedGroups.length === 0) {
			return store;
		}
		const folderIds = new Set([folder.id, ...this.collectDescendantIds(folder.id, store.folders)]);
		const inner = new Set(store.plans
			.filter(p => p.parentPlanId === null && p.folderId !== null && folderIds.has(p.folderId))
			.flatMap(p => [p.id, ...this.collectDescendantPlanIds(p.id, store.plans)]));
		return {
			...store,
			plans: store.plans.map(plan => {
				if (!inner.has(plan.id) || (onlyPlanIds !== null && !onlyPlanIds.has(plan.id))) {
					return plan;
				}
				if (!SettingsGroups.differ(plan.settings, folder.settings!, folder.fixedGroups)) {
					return plan;
				}
				return {
					...plan,
					settings: SettingsGroups.apply(plan.settings, folder.settings!, folder.fixedGroups),
					metadata: plan.graph
						? {...plan.metadata, recalculationNeeded: true}
						: plan.metadata,
				};
			}),
		};
	}

	/** The folder the plan's top-level ancestor sits in (a subplan lives where its parent does). */
	private topLevelFolderIdOf(plan: Plan, plans: readonly Plan[]): string | null
	{
		const seen = new Set<string>();
		let current: Plan | undefined = plan;
		while (current && current.parentPlanId !== null && !seen.has(current.id)) {
			seen.add(current.id);
			current = plans.find(p => p.id === current!.parentPlanId);
		}
		return current?.folderId ?? null;
	}

	/** Position for an item appended to the siblings: after the last ordered one, or none when nothing is ordered yet. */
	private nextOrder(siblings: readonly {order?: number}[]): number | undefined
	{
		const orders = siblings.map(s => s.order).filter((o): o is number => o !== undefined);
		return orders.length > 0 ? Math.max(...orders) + 1 : undefined;
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
			disabledResources: parent?.settings.disabledResources ? [...parent.settings.disabledResources] : undefined,
			enabledFuels: parent?.settings.enabledFuels
				? Object.fromEntries(Object.entries(parent.settings.enabledFuels).map(([gen, fuels]) => [gen, [...fuels]]))
				: undefined,
			disabledByproducts: parent?.settings.disabledByproducts ? [...parent.settings.disabledByproducts] : undefined,
		};
		const fixed = parent ? this.fixedFolderOf(parent) : null;
		return this.insertPlan(name, null, parentPlanId, fixed?.settings
			? SettingsGroups.apply(settings, fixed.settings, fixed.fixedGroups)
			: settings);
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
		if (this.isSharedPlan(updated.id)) return;
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === updated.id ? updated : p),
		}));
	}

	/** Groups fixed by the plan's folder are re-applied, so no plan-side edit (reset, inherit, save import) can drift from the folder. */
	public setSettings(planId: string, settings: PlanSettings): void
	{
		if (this.isSharedPlan(planId)) return;
		const plan = this.plans().find(p => p.id === planId);
		const fixed = plan ? this.fixedFolderOf(plan) : null;
		const effective = fixed?.settings
			? SettingsGroups.apply(settings, fixed.settings, fixed.fixedGroups)
			: settings;
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p, settings: effective} : p),
		}));
	}

	/**
	 * Null removes the folder's custom settings (and any fixed groups) - it
	 * inherits from its parent again. New values of fixed groups are pushed
	 * into the inner plans right away.
	 */
	public setFolderSettings(folderId: string, settings: PlanSettings | null): void
	{
		this.mutate(store => {
			const folder = store.folders.find(f => f.id === folderId);
			if (!folder) {
				return store;
			}
			const updated: Folder = settings === null
				? {...folder, settings: null, fixedGroups: [], resourcePool: false}
				: {...folder, settings};
			const next = {...store, folders: store.folders.map(f => f.id === folderId ? updated : f)};
			return this.pushFixedSettings(next, updated, null);
		});
	}

	/** Routes a settings edit to whatever the calculator is editing (see activeSettings). */
	public updateActiveSettings(settings: PlanSettings): void
	{
		if (this.activePlanShared()) return;
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
			disabledMachines: settings.disabledMachines ? [...settings.disabledMachines] : undefined,
			resourceLimits: settings.resourceLimits ? {...settings.resourceLimits} : undefined,
			disabledResources: settings.disabledResources ? [...settings.disabledResources] : undefined,
			resourceWeightMode: settings.resourceWeightMode,
			resourceWeights: settings.resourceWeights ? {...settings.resourceWeights} : undefined,
			enabledFuels: settings.enabledFuels
				? Object.fromEntries(Object.entries(settings.enabledFuels).map(([generator, fuels]) => [generator, [...fuels]]))
				: undefined,
			disabledByproducts: settings.disabledByproducts ? [...settings.disabledByproducts] : undefined,
			sinkableItems: settings.sinkableItems ? [...settings.sinkableItems] : undefined,
			producePowerForFactory: settings.producePowerForFactory,
			excessPowerPercent: settings.excessPowerPercent,
			optimisation: settings.optimisation ? {...settings.optimisation} : undefined,
			defaultGroupingMode: settings.defaultGroupingMode,
			defaultClockSpeed: settings.defaultClockSpeed,
			recipeClockSpeeds: settings.recipeClockSpeeds ? settings.recipeClockSpeeds.map(entry => ({...entry})) : undefined,
			machineClockSpeeds: settings.machineClockSpeeds ? settings.machineClockSpeeds.map(entry => ({...entry})) : undefined,
			maxSloops: settings.maxSloops,
			sloopAccuracy: settings.sloopAccuracy,
		};
	}

	public setRequests(planId: string, requests: ProductionRequest[]): void
	{
		if (this.isSharedPlan(planId)) return;
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p, requests: [...requests]} : p),
		}));
	}

	public setInputs(planId: string, inputs: PlanInput[]): void
	{
		if (this.isSharedPlan(planId)) return;
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p, inputs: [...inputs]} : p),
		}));
	}

	/** Omitting graphDirty keeps the plan's current dirty state (e.g. graph revival on load). */
	public setGraph(planId: string, graph: Graph | null, graphDirty?: boolean): void
	{
		if (this.isSharedPlan(planId)) return;
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId
				? {
					...p,
					graph,
					// A completed solve (graphDirty false) reflects the current settings again.
					metadata: graphDirty === undefined
						? p.metadata
						: {...p.metadata, graphDirty, recalculationNeeded: graphDirty ? p.metadata.recalculationNeeded : undefined},
				}
				: p),
		}));
	}

	/** Stores the achieved rates of a maximise solve; undefined clears them (non-maximise solve). */
	public setAchievedMaximums(planId: string, achievedMaximums: Record<string, number> | undefined): void
	{
		if (this.isSharedPlan(planId)) return;
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p, metadata: {...p.metadata, achievedMaximums}} : p),
		}));
	}

	public setGraphDirty(planId: string, graphDirty: boolean): void
	{
		if (this.isSharedPlan(planId)) return;
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
		if (this.isSharedPlan(planId)) return;
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === planId ? {...p} : p),
		}));
	}

	/** Deletes the plan and its subplans; their nodes are scrubbed from every remaining graph. */
	public deletePlan(id: string): void
	{
		if (this.isSharedPlan(id)) return;
		const store = this.data();
		const deletedIds = new Set([id, ...this.collectDescendantPlanIds(id, store.plans)]);
		const scrubbed = this.scrubSubplanNodes(store.plans.filter(p => !deletedIds.has(p.id)), deletedIds);
		this.mutate(s => ({...s, plans: scrubbed.plans}));
		if (this.activePlanIdSignal() !== null && deletedIds.has(this.activePlanIdSignal()!)) {
			this.activePlanIdSignal.set(null);
		}
		this.notifyScrubbed(scrubbed.scrubbedIds);
	}

	public renamePlan(id: string, name: string): void
	{
		if (this.isSharedPlan(id)) return;
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === id ? {...p, name} : p),
		}));
	}

	/** Sets (or clears, with null) a plan's icon override. */
	public setPlanIcon(id: string, iconClassName: string | null): void
	{
		if (this.isSharedPlan(id)) return;
		this.mutate(store => ({
			...store,
			plans: store.plans.map(p => p.id === id ? {...p, iconClassName} : p),
		}));
	}

	/**
	 * Makes the plan top-level, placed last in the given folder (null for
	 * root). Inside a folder that fixes settings groups the plan takes those
	 * values (the caller confirms the overwrite first).
	 */
	public movePlan(planId: string, folderId: string | null): void
	{
		this.placePlan(planId, folderId, null, null);
	}

	/**
	 * Moves the plan among the siblings of the target (a folder's top-level
	 * plans, or a plan's subplans) at the given index - null appends. An
	 * explicit index materialises the whole sibling list's order.
	 */
	public placePlan(planId: string, folderId: string | null, parentPlanId: string | null, index: number | null): void
	{
		if (this.isSharedPlan(planId)) return;
		if (parentPlanId !== null && (parentPlanId === planId || this.collectDescendantPlanIds(planId, this.plans()).includes(parentPlanId))) {
			return; // would create a cycle
		}
		this.mutate(store => {
			const plan = store.plans.find(p => p.id === planId);
			if (!plan) {
				return store;
			}
			const siblings = this.orderedPlans(store, folderId, parentPlanId).filter(p => p.id !== planId);
			const moved: Plan = {...plan, folderId: parentPlanId === null ? folderId : null, parentPlanId};
			const placed = index === null
				? [...siblings, {...moved, order: this.nextOrder(siblings)}]
				: this.withOrders([...siblings.slice(0, index), moved, ...siblings.slice(index)]);
			const byId = new Map(placed.map(p => [p.id, p]));
			const next = {...store, plans: store.plans.map(p => byId.get(p.id) ?? p)};
			const fixed = this.fixedFolderForFolderIn(next.folders, parentPlanId === null ? folderId : this.topLevelFolderIdOf(moved, next.plans));
			return fixed
				? this.pushFixedSettings(next, fixed, new Set([planId, ...this.collectDescendantPlanIds(planId, next.plans)]))
				: next;
		});
	}

	/** Moves the folder last into the new parent; see placeFolder. */
	public moveFolder(folderId: string, newParentId: string | null): void
	{
		this.placeFolder(folderId, newParentId, null);
	}

	/**
	 * Moves the folder among the new parent's subfolders at the given index
	 * (null appends). Under a folder that fixes settings groups the moved
	 * folder and its subfolders lose their custom settings and their plans
	 * take the fixed values (the caller confirms first).
	 */
	public placeFolder(folderId: string, newParentId: string | null, index: number | null): void
	{
		const store = this.data();
		const descendantIds = this.collectDescendantIds(folderId, store.folders);
		if (newParentId !== null && (newParentId === folderId || descendantIds.includes(newParentId))) {
			return; // would create a cycle
		}
		this.mutate(s => {
			const folder = s.folders.find(f => f.id === folderId);
			if (!folder) {
				return s;
			}
			const siblings = this.orderedFolders(s, newParentId).filter(f => f.id !== folderId);
			const moved: Folder = {...folder, parentId: newParentId};
			const placed = index === null
				? [...siblings, {...moved, order: this.nextOrder(siblings)}]
				: this.withOrders([...siblings.slice(0, index), moved, ...siblings.slice(index)]);
			const byId = new Map(placed.map(f => [f.id, f]));
			let next: PlanStore = {...s, folders: s.folders.map(f => byId.get(f.id) ?? f)};

			const fixed = this.fixedFolderForFolderIn(next.folders, newParentId);
			if (fixed) {
				const stripped = new Set([folderId, ...descendantIds]);
				next = {
					...next,
					folders: next.folders.map(f => stripped.has(f.id) && f.settings !== null
						? {...f, settings: null, fixedGroups: [], resourcePool: false}
						: f),
				};
				const movedPlanIds = new Set(next.plans
					.filter(p => p.parentPlanId === null && p.folderId !== null && stripped.has(p.folderId))
					.flatMap(p => [p.id, ...this.collectDescendantPlanIds(p.id, next.plans)]));
				next = this.pushFixedSettings(next, fixed, movedPlanIds);
			}
			return next;
		});
	}

	/** Sibling plans in display order: the folder's top-level plans (null = root), or a plan's subplans. */
	public siblingPlans(folderId: string | null, parentPlanId: string | null): Plan[]
	{
		return this.orderedPlans(this.data(), folderId, parentPlanId);
	}

	public siblingFolders(parentId: string | null): Folder[]
	{
		return this.orderedFolders(this.data(), parentId);
	}

	/** The folder a plan lives in - for a subplan, the folder of its top-level ancestor. */
	public folderIdOfPlan(plan: Plan): string | null
	{
		return this.topLevelFolderIdOf(plan, this.plans());
	}

	/** Sibling plans in display order: the folder's top-level plans, or a plan's subplans. */
	private orderedPlans(store: PlanStore, folderId: string | null, parentPlanId: string | null): Plan[]
	{
		return store.plans
			.filter(p => parentPlanId === null
				? p.parentPlanId === null && p.folderId === folderId
				: p.parentPlanId === parentPlanId)
			.sort(PlanManager.bySiblingOrder);
	}

	private orderedFolders(store: PlanStore, parentId: string | null): Folder[]
	{
		return store.folders.filter(f => f.parentId === parentId).sort(PlanManager.bySiblingOrder);
	}

	/** Gives the list explicit positions 0..n-1 in its current order. */
	private withOrders<T extends {order?: number}>(items: T[]): T[]
	{
		return items.map((item, order) => ({...item, order}));
	}

	private fixedFolderForFolderIn(folders: readonly Folder[], folderId: string | null): Folder | null
	{
		const seen = new Set<string>();
		let id = folderId;
		while (id !== null && !seen.has(id)) {
			seen.add(id);
			const folder = folders.find(f => f.id === id);
			if (!folder) {
				return null;
			}
			if (folder.fixedGroups.length > 0) {
				return folder;
			}
			id = folder.parentId;
		}
		return null;
	}

	/** Ordered items first by position, unordered ones after them alphabetically - so untouched trees keep their old order. */
	private static bySiblingOrder(a: {order?: number; name: string}, b: {order?: number; name: string}): number
	{
		const orderA = a.order ?? Number.POSITIVE_INFINITY;
		const orderB = b.order ?? Number.POSITIVE_INFINITY;
		return orderA - orderB || a.name.localeCompare(b.name);
	}

	private mutate(updater: (store: PlanStore) => PlanStore): void
	{
		this.persist(updater(this.data()));
	}

	private buildTree(store: PlanStore): PlanTree
	{
		const byName = PlanManager.bySiblingOrder;
		const byPlanName = PlanManager.bySiblingOrder;

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

	/** The plan's descendant subplans (all levels), e.g. for undo/redo snapshots. */
	public subplansOf(planId: string): Plan[]
	{
		const plans = this.data().plans;
		const ids = new Set(this.collectDescendantPlanIds(planId, plans));
		return plans.filter(p => ids.has(p.id));
	}

	/**
	 * Restores the descendant-subplan set of `parentId` to `target` (an undo/
	 * redo snapshot): subplans missing from the store are recreated, ones not
	 * in the snapshot are deleted, and surviving ones stay untouched so edits
	 * made outside the snapshotted operation are not reverted. Recreated plans
	 * are new to the API again, so their revision restarts.
	 */
	public reconcileSubplans(parentId: string, target: Plan[]): void
	{
		if (this.isSharedPlan(parentId)) return;
		const store = this.data();
		const currentIds = new Set(this.collectDescendantPlanIds(parentId, store.plans));
		const targetIds = new Set(target.map(p => p.id));
		const missing = target.filter(p => !currentIds.has(p.id)).map(p => ({...p, revision: null}));
		const extraIds = new Set([...currentIds].filter(id => !targetIds.has(id)));
		if (missing.length === 0 && extraIds.size === 0) {
			return;
		}
		const scrubbed = this.scrubSubplanNodes(store.plans.filter(p => !extraIds.has(p.id)), extraIds);
		this.mutate(s => ({...s, plans: [...scrubbed.plans, ...missing]}));
		if (this.activePlanIdSignal() !== null && extraIds.has(this.activePlanIdSignal()!)) {
			this.activePlanIdSignal.set(null);
		}
		this.notifyScrubbed(scrubbed.scrubbedIds);
	}

	/**
	 * Removes subplan nodes referencing any of `deletedPlanIds` (with every
	 * edge touching them) from all given plans' graphs; affected graphs are
	 * marked dirty. Works on hydrated and raw-JSON graphs alike - both carry
	 * type and subplanId.
	 */
	private scrubSubplanNodes(plans: Plan[], deletedPlanIds: Set<string>): {plans: Plan[]; scrubbedIds: string[]}
	{
		const scrubbedIds: string[] = [];
		const result = plans.map(plan => {
			if (!plan.graph) {
				return plan;
			}
			const nodeIds = new Set(plan.graph.nodes
				.filter(node => {
					const raw = node as unknown as {type?: string; subplanId?: string};
					return raw.type === 'subplan' && raw.subplanId !== undefined && deletedPlanIds.has(raw.subplanId);
				})
				.map(node => node.id));
			if (nodeIds.size === 0) {
				return plan;
			}
			scrubbedIds.push(plan.id);
			return {
				...plan,
				graph: {
					nodes: plan.graph.nodes.filter(node => !nodeIds.has(node.id)),
					edges: plan.graph.edges.filter(edge => !nodeIds.has(edge.sourceId) && !nodeIds.has(edge.targetId)),
				},
				metadata: {...plan.metadata, graphDirty: true},
			};
		});
		return {plans: result, scrubbedIds};
	}

	private notifyScrubbed(planIds: string[]): void
	{
		if (planIds.length > 0) {
			this.scrubbedGraphsSubject.next(planIds);
		}
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
			order: this.nextOrder(this.orderedPlans(this.data(), folderId, parentPlanId)),
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
