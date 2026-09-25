import {AfterViewChecked, Component, ElementRef, OnDestroy, Signal, ViewChild, ChangeDetectionStrategy, computed, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faAnglesDown, faAnglesUp, faCaretDown, faCaretRight, faDiagramProject, faEllipsisVertical, faFileImport, faFileLines, faFolder, faFolderOpen, faFolderPlus, faLaptop, faLayerGroup, faLock, faPlus, faShareNodes} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {LongPressContextMenuDirective} from '@src/Components/Common/LongPressContextMenuDirective';
import {LongPressDragDirective} from '@src/Components/Common/LongPressDragDirective';
import {CollapsedSectionsService} from '@src/Components/Common/CollapsedSectionsService';
import {CollapsibleSections} from '@src/Components/Common/CollapsibleSections';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {IconPickerDialogComponent} from '@src/Components/Common/IconPickerDialogComponent';
import {TruncateTitleDirective} from '@src/Components/Common/TruncateTitleDirective';
import {ImportOldPlansDialogComponent} from '@src/Components/Planner/Panels/Plans/ImportOldPlansDialogComponent';
import {PlannerContextMenuService} from '@src/Components/Planner/ContextMenu/PlannerContextMenuService';
import {DropPosition} from '@src/Components/Planner/Panels/Plans/DropPosition';
import {DropTarget} from '@src/Components/Planner/Panels/Plans/DropTarget';
import {FolderContextMenu} from '@src/Components/Planner/Panels/Plans/FolderContextMenu';
import {LocalItemContextMenu} from '@src/Components/Planner/Panels/Plans/LocalItemContextMenu';
import {PlanContextMenu} from '@src/Components/Planner/Panels/Plans/PlanContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';
import {HotkeyItem} from '@src/Model/Hotkeys/HotkeyItem';
import {HotkeyItemSource} from '@src/Model/Hotkeys/HotkeyItemSource';
import {HotkeyRegistration} from '@src/Model/Hotkeys/HotkeyRegistration';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';
import {VisitedShareContextMenu} from '@src/Components/Planner/Panels/Plans/VisitedShareContextMenu';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {ShareDialogService} from '@src/Components/Planner/Share/ShareDialogService';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanTree} from '@src/Model/Planner/PlanTree';
import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';
import {SettingsGroups} from '@src/Model/Planner/SettingsGroups';
import {ActiveShareManager} from '@src/Model/Shares/ActiveShareManager';
import {ShareTreeCache} from '@src/Model/Shares/ShareTreeCache';
import {ShareTreeNode} from '@src/Model/Shares/ShareTreeNode';
import {VisitedShare} from '@src/Model/Shares/VisitedShare';
import {VisitedSharesManager} from '@src/Model/Shares/VisitedSharesManager';

interface FolderItem
{
	readonly type: 'folder';
	readonly depth: number;
	readonly id: string;
	readonly name: string;
	readonly isOpen: boolean;
	readonly isEditing: boolean;
	/** The folder fixes settings groups for everything inside - shown as a lock. */
	readonly fixedSummary: string | null;
}

interface PlanItem
{
	readonly type: 'plan';
	readonly depth: number;
	readonly plan: Plan;
	readonly isEditing: boolean;
	readonly hasSubplans: boolean;
	readonly isOpen: boolean;
	/** Lives inside its parent plan's graph rather than in a folder. */
	readonly isSubplan: boolean;
}

interface InputItem
{
	readonly type: 'input';
	readonly depth: number;
	readonly mode: 'folder' | 'plan';
	readonly parentId: string | null;
}

type TreeItem = FolderItem | PlanItem | InputItem;

/** A row in the "On this device" section: plans open read-only, folders only label the rows below. */
interface LocalItem
{
	readonly kind: 'folder' | 'plan';
	readonly depth: number;
	readonly id: string;
	readonly name: string;
	readonly iconHash: string | null;
	/** Subplans migrate with their parent plan and cannot be dragged on their own. */
	readonly isSubplan: boolean;
	readonly hasChildren: boolean;
	readonly isOpen: boolean;
}

/** A row of a share's tree in the "Shared plans" section (below the share's own row). */
interface SharedTreeItem
{
	readonly kind: 'folder' | 'plan';
	readonly depth: number;
	/** The sharer's original id from the payload - mapped to the hydrated plan while the share is open. */
	readonly payloadId: string;
	/** Collapse key, unique across shares (payload ids may repeat across shares of the same plan). */
	readonly key: string;
	readonly name: string;
	readonly iconHash: string | null;
	readonly isSubplan: boolean;
	readonly hasChildren: boolean;
	readonly isOpen: boolean;
}

/**
 * The tree row being dragged. Account rows move within the tree; a local
 * row (this device's plans) or a shared row (a visited share - its id is
 * the share uuid) is copied/moved INTO the account tree when dropped on it.
 */
interface DragItem
{
	readonly type: 'plan' | 'folder';
	readonly id: string;
	readonly source: 'account' | 'local' | 'shared';
	/** Shared rows only: the share's game version, which must be the active one. */
	readonly versionId?: string;
}

interface EditState
{
	readonly mode: 'new-folder' | 'new-plan' | 'rename-folder' | 'rename-plan';
	readonly targetId: string | null;
	readonly parentId: string | null;
}

const ROOT_ID = '__root__';
const LOCAL_ID = '__local__';
const SHARED_ID = '__shared__';

/** How close to the edge of the list a touch drag starts scrolling it, and how fast. */
const AUTO_SCROLL_EDGE = 48; // px
const AUTO_SCROLL_STEP = 8; // px per step
const AUTO_SCROLL_INTERVAL_MS = 16;

@Component({
	selector: 'planner-plans',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerPlansComponent.html',
	styleUrl: './PlannerPlansComponent.scss',
	imports: [FormsModule, FaIconComponent, AppTooltipDirective, GameIconComponent, IconPickerDialogComponent, ImportOldPlansDialogComponent, TruncateTitleDirective, InfoNoteComponent, LongPressContextMenuDirective, LongPressDragDirective],
})
export class PlannerPlansComponent implements AfterViewChecked, OnDestroy, PlanTreeMenuHost, HotkeyItemSource
{

	public readonly faCaretDown = faCaretDown;
	public readonly faAnglesDown = faAnglesDown;
	public readonly faAnglesUp = faAnglesUp;
	public readonly faCaretRight = faCaretRight;
	public readonly faDiagramProject = faDiagramProject;
	public readonly faEllipsisVertical = faEllipsisVertical;
	public readonly faFileImport = faFileImport;
	public readonly faFileLines = faFileLines;
	public readonly faFolder = faFolder;
	public readonly faFolderOpen = faFolderOpen;
	public readonly faFolderPlus = faFolderPlus;
	public readonly faLaptop = faLaptop;
	public readonly faLayerGroup = faLayerGroup;
	public readonly faLock = faLock;
	public readonly faPlus = faPlus;
	public readonly faShareNodes = faShareNodes;

	public readonly activePlanId: Signal<string | null>;
	public readonly activeFolderId: Signal<string | null>;

	/**
	 * Which sections, folders, plans and subplans are folded. Shared and
	 * keyed by id, so the tree looks the same after closing and reopening
	 * the panel; a share's nodes are keyed `{share}:{node}`.
	 */
	public readonly foldState: CollapsibleSections;
	private readonly editStateSignal = signal<EditState | null>(null);
	public readonly editState: Signal<EditState | null> = this.editStateSignal.asReadonly();
	public editValue: string = '';

	private needsFocus = false;
	private dragItem: DragItem | null = null;

	/** Where the dragging finger last was, kept so auto-scrolling can re-check the row under it. */
	private touchPoint: {x: number; y: number} | null = null;
	private autoScrollTimer: ReturnType<typeof setInterval> | null = null;
	private autoScrollSpeed = 0;

	private readonly dropTargetSignal = signal<DropTarget | null>(null);
	public readonly dropTarget: Signal<DropTarget | null> = this.dropTargetSignal.asReadonly();

	/** The row a finger is holding, dimmed while it travels (a mouse drag has the browser's own ghost instead). */
	private readonly touchDragIdSignal = signal<string | null>(null);
	public readonly touchDragId: Signal<string | null> = this.touchDragIdSignal.asReadonly();

	@ViewChild('editInput') private editInputRef?: ElementRef<HTMLInputElement>;

	public readonly treeItems: Signal<TreeItem[]> = computed(() => {
		const tree = this.planManager.planTree();
		if (!this.foldState.isOpen(ROOT_ID)) return [];
		return this.flattenTree(tree.entries, this.editStateSignal());
	});

	/** Flattens a (sub)tree into rows, honouring collapsed nodes and (for the user's own tree) the inline edit row. */
	private flattenTree(entries: (PlanTreeFolder | PlanTreePlan)[], editing: EditState | null): TreeItem[]
	{
		const items: TreeItem[] = [];

		const isFolderEditing = (id: string): boolean =>
			editing?.mode === 'rename-folder' && editing.targetId === id;
		const isPlanEditing = (id: string): boolean =>
			editing?.mode === 'rename-plan' && editing.targetId === id;

		if (editing?.parentId === null && (editing.mode === 'new-folder' || editing.mode === 'new-plan')) {
			items.push({type: 'input', depth: 0, mode: editing.mode === 'new-folder' ? 'folder' : 'plan', parentId: null});
		}

		const addPlan = (node: PlanTreePlan, depth: number): void => {
			const isOpen = this.foldState.isOpen(node.plan.id);
			items.push({
				type: 'plan',
				depth,
				plan: node.plan,
				isEditing: isPlanEditing(node.plan.id),
				hasSubplans: node.subplans.length > 0,
				isOpen,
				isSubplan: node.plan.parentPlanId !== null,
			});
			if (!isOpen) return;

			node.subplans.forEach(sub => addPlan(sub, depth + 1));
		};

		const addFolder = (node: PlanTreeFolder, depth: number): void => {
			const isOpen = this.foldState.isOpen(node.folder.id);
			items.push({
				type: 'folder',
				depth,
				id: node.folder.id,
				name: node.folder.name,
				isOpen,
				isEditing: isFolderEditing(node.folder.id),
				fixedSummary: node.folder.fixedGroups.length > 0
					? 'This folder fixes ' + node.folder.fixedGroups
						.map(group => group === 'resources' && node.folder.resourcePool ? 'Resources (shared pool)' : SettingsGroups.labelOf(group))
						.join(', ')
						+ ' for every plan inside. The plans cannot change these settings and follow the folder.'
					: null,
			});
			if (!isOpen) return;

			if (editing && editing.parentId === node.folder.id && (editing.mode === 'new-folder' || editing.mode === 'new-plan')) {
				items.push({type: 'input', depth: depth + 1, mode: editing.mode === 'new-folder' ? 'folder' : 'plan', parentId: node.folder.id});
			}

			node.entries.forEach(entry => addEntry(entry, depth + 1));
		};

		const addEntry = (entry: PlanTreeFolder | PlanTreePlan, depth: number): void =>
			'folder' in entry ? addFolder(entry, depth) : addPlan(entry, depth);

		entries.forEach(entry => addEntry(entry, 0));

		return items;
	}

	public readonly rootOpen: Signal<boolean> = computed(() => this.foldState.isOpen(ROOT_ID));

	/**
	 * Everything inside "Your plans" that can fold: its folders and the plans
	 * that have subplans. The section's own band is not one of them - folding
	 * everything inside it should not also close the section.
	 */
	public readonly rootFoldableIds: Signal<string[]> = computed(() =>
		this.foldableIdsOf(this.planManager.planTree().entries));

	/** Same for this device's own plans. */
	public readonly localFoldableIds: Signal<string[]> = computed(() =>
		this.foldableIdsOf(this.planManager.localPlanTree().entries));

	/** Same for the visited shares: each share's row, plus the foldable nodes of its frozen tree. */
	public readonly sharedFoldableIds: Signal<string[]> = computed(() => {
		const trees = this.shareTrees.trees();
		const ids: string[] = [];
		this.sharedList().forEach(share => {
			const root = trees.get(share.share);
			if (!root || root.children.length === 0) {
				return;
			}
			ids.push(share.share);
			const add = (node: ShareTreeNode): void => {
				if (node.children.length === 0) {
					return;
				}
				ids.push(share.share + ':' + node.id);
				node.children.forEach(add);
			};
			root.children.forEach(add);
		});
		return ids;
	});

	private foldableIdsOf(entries: (PlanTreeFolder | PlanTreePlan)[]): string[]
	{
		const ids: string[] = [];
		const addPlan = (node: PlanTreePlan): void => {
			if (node.subplans.length === 0) {
				return;
			}
			ids.push(node.plan.id);
			node.subplans.forEach(addPlan);
		};
		const addEntry = (entry: PlanTreeFolder | PlanTreePlan): void => {
			if ('folder' in entry) {
				ids.push(entry.folder.id);
				entry.entries.forEach(addEntry);
			} else {
				addPlan(entry);
			}
		};
		entries.forEach(addEntry);
		return ids;
	}

	/** The "expand all" / "collapse all" buttons of one section. */
	public setAllFolds(ids: readonly string[], open: boolean): void
	{
		this.foldState.setMany(ids, open);
	}

	/** Plans (subplans excluded) in the user's own tree - the section header shows the count. */
	public readonly planCount: Signal<number> = computed(() => this.countPlans(this.planManager.planTree().entries));

	/** True when the user's own tree has nothing in it yet - the section shows a short hint instead of rows. */
	public readonly rootEmpty: Signal<boolean> = computed(() => this.planManager.planTree().entries.length === 0);

	/** Plans (subplans excluded) stored only in this browser. */
	public readonly localPlanCount: Signal<number> = computed(() => this.countPlans(this.planManager.localPlanTree().entries));

	private countPlans(entries: (PlanTreeFolder | PlanTreePlan)[]): number
	{
		return entries.reduce((sum, entry) => sum + ('folder' in entry ? this.countPlans(entry.entries) : 1), 0);
	}
	public readonly localOpen: Signal<boolean> = computed(() => this.foldState.isOpen(LOCAL_ID));
	public readonly sharedOpen: Signal<boolean> = computed(() => this.foldState.isOpen(SHARED_ID));

	/** Every share link the user has opened, most recently added first, across all versions. */
	private readonly allShares: Signal<VisitedShare[]>;

	/**
	 * The listed shares: those made for the active game version, so every
	 * row opens in place and can be dragged into "Your plans". Shares of
	 * other versions show up in that version's planner instead.
	 */
	public readonly sharedList: Signal<VisitedShare[]> = computed(() => {
		const versionId = this.versionManager.activeVersion()?.id;
		return this.allShares().filter(share => share.version.id === versionId);
	});

	/** Visited shares made for another game version than the active one. */
	public readonly otherVersionShareCount: Signal<number> = computed(() => {
		const versionId = this.versionManager.activeVersion()?.id;
		return this.allShares().filter(share => share.version.id !== versionId).length;
	});

	/** The section shows whenever any share was visited - possibly just as an empty state counting the other versions' shares. */
	public readonly showSharedSection: Signal<boolean> = computed(() => this.allShares().length > 0);

	public readonly activeVersionName: Signal<string> = computed(() => this.versionManager.activeVersion()?.name ?? 'this version');

	/** The share currently open in the planner, or null. */
	public readonly activeShareId: Signal<string | null>;

	/**
	 * Every listed share's tree BELOW its root, from the device's snapshot
	 * cache (see ShareTreeCache) - shown whether or not the share is open.
	 * The root itself (the shared plan or folder) is not repeated: the
	 * share's own list row is that row. Keyed by share uuid.
	 */
	public readonly sharedTreeItemsByShare: Signal<Map<string, SharedTreeItem[]>> = computed(() => {
		const trees = this.shareTrees.trees();
		const data = this.versionManager.activeVersionData();
		const result = new Map<string, SharedTreeItem[]>();
		this.sharedList().forEach(share => {
			const root = trees.get(share.share);
			if (!root) {
				return;
			}
			const items: SharedTreeItem[] = [];
			const add = (node: ShareTreeNode, depth: number, isSubplan: boolean): void => {
				const key = share.share + ':' + node.id;
				const isOpen = this.foldState.isOpen(key);
				items.push({
					kind: node.kind,
					depth,
					payloadId: node.id,
					key,
					name: node.kind === 'plan' ? this.planNames.displayNameOf(node.name) : node.name,
					iconHash: node.kind === 'plan' && node.iconClassName !== null ? data?.iconForClassName(node.iconClassName) ?? null : null,
					isSubplan,
					hasChildren: node.children.length > 0,
					isOpen,
				});
				if (isOpen) {
					node.children.forEach(child => add(child, depth + 1, node.kind === 'plan'));
				}
			};
			root.children.forEach(child => add(child, 0, root.kind === 'plan'));
			result.set(share.share, items);
		});
		return result;
	});

	/**
	 * Payload ids on the path from the open share's root to its selected
	 * plan (exclusive) - those rows are highlighted as ancestors, like the
	 * folder chain and subplan parents in "Your plans".
	 */
	public readonly sharedAncestorPayloadIds: Signal<Set<string>> = computed(() => {
		const shareId = this.activeShareId();
		const activeId = this.activeShare.activePayloadPlanId();
		const root = shareId !== null ? this.shareTrees.trees().get(shareId) : undefined;
		const ids = new Set<string>();
		if (!root || activeId === null) {
			return ids;
		}
		const pathTo = (node: ShareTreeNode, path: string[]): string[] | null => {
			if (node.id === activeId) {
				return path;
			}
			for (const child of node.children) {
				const found = pathTo(child, [...path, node.id]);
				if (found) {
					return found;
				}
			}
			return null;
		};
		(pathTo(root, []) ?? []).forEach(id => ids.add(id));
		return ids;
	});

	/** True while the open share's root plan is the selected one - its list row is then the active row. */
	public readonly activeShareRootActive: Signal<boolean> = computed(() => {
		const root = this.activeShare.rootPlan();
		return root !== null && root.id === this.activePlanId();
	});

	/** Shown while signed in AND this device still has local plans to migrate. */
	public readonly showLocalSection: Signal<boolean> = computed(() =>
		this.planManager.isAuthenticated() && this.localTreeItems().length > 0);

	/** Flattened rows of this device's local plans; folders and plans with subplans fold by id, like the account tree. */
	public readonly localTreeItems: Signal<LocalItem[]> = computed(() => {
		const tree = this.planManager.localPlanTree();
		const items: LocalItem[] = [];
		const addPlan = (node: PlanTreePlan, depth: number): void => {
			const isOpen = this.foldState.isOpen(node.plan.id);
			items.push({
				kind: 'plan',
				depth,
				id: node.plan.id,
				name: this.planNames.displayName(node.plan),
				iconHash: this.planIcons.iconHash(node.plan),
				isSubplan: node.plan.parentPlanId !== null,
				hasChildren: node.subplans.length > 0,
				isOpen,
			});
			if (isOpen) {
				node.subplans.forEach(sub => addPlan(sub, depth + 1));
			}
		};
		const addFolder = (node: PlanTreeFolder, depth: number): void => {
			const isOpen = this.foldState.isOpen(node.folder.id);
			items.push({
				kind: 'folder',
				depth,
				id: node.folder.id,
				name: node.folder.name,
				iconHash: null,
				isSubplan: false,
				hasChildren: node.entries.length > 0,
				isOpen,
			});
			if (isOpen) {
				node.entries.forEach(entry => addEntry(entry, depth + 1));
			}
		};
		const addEntry = (entry: PlanTreeFolder | PlanTreePlan, depth: number): void =>
			'folder' in entry ? addFolder(entry, depth) : addPlan(entry, depth);
		tree.entries.forEach(entry => addEntry(entry, 0));
		return items;
	});

	/**
	 * Ids of every folder and plan on the path from the root to the active
	 * plan (subplan parents first, then the folder chain) - highlighted so
	 * the tree always shows where the selection lives.
	 */
	public readonly activeAncestorIds: Signal<Set<string>> = computed(() => {
		const ids = new Set<string>();
		// All three stores: the open share's and this device's subplans/folders highlight their ancestors the same way.
		const plans = [...this.planManager.plans(), ...this.planManager.sharedPlans(), ...this.planManager.localPlans()];
		const folders = [...this.planManager.folders(), ...this.planManager.sharedFolders(), ...this.planManager.localFolders()];

		let plan = plans.find(p => p.id === this.activePlanId()) ?? null;
		while (plan && plan.parentPlanId !== null) {
			plan = plans.find(p => p.id === plan!.parentPlanId) ?? null;
			if (plan) ids.add(plan.id);
		}

		// Path to the active plan's folder, or to the active folder's parent.
		let folderId = plan?.folderId
			?? (this.activeFolderId() !== null
				? folders.find(f => f.id === this.activeFolderId())?.parentId ?? null
				: null);
		while (folderId !== null) {
			ids.add(folderId);
			folderId = folders.find(f => f.id === folderId)?.parentId ?? null;
		}

		return ids;
	});

	/** The plan whose icon is being picked, or null when the dialog is closed. */
	private readonly iconPickerPlanIdSignal = signal<string | null>(null);
	public readonly iconPickerOpen: Signal<boolean> = computed(() => this.iconPickerPlanIdSignal() !== null);

	private hotkeyRegistration: HotkeyRegistration | null = null;

	private readonly importDialogOpenSignal = signal(false);
	public readonly importDialogOpen: Signal<boolean> = this.importDialogOpenSignal.asReadonly();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly contextMenu: PlannerContextMenuService,
		private readonly planIcons: PlanIconResolver,
		private readonly planNames: PlanNameResolver,
		private readonly versionManager: VersionManager,
		private readonly shareDialog: ShareDialogService,
		private readonly notifications: NotificationService,
		private readonly visitedShares: VisitedSharesManager,
		private readonly activeShare: ActiveShareManager,
		private readonly shareTrees: ShareTreeCache,
		public readonly hotkeys: HotkeyService,
		private readonly router: Router,
		private readonly elementRef: ElementRef<HTMLElement>,
		collapsedSections: CollapsedSectionsService,
	)
	{
		this.foldState = new CollapsibleSections(collapsedSections, 'plans');
		this.hotkeyRegistration = hotkeys.registerSource(this);
		// A share visited on another device has no local tree snapshot yet - fetch it once.
		toObservable(visitedShares.visitedShares).subscribe(shares => shares.forEach(share => shareTrees.ensure(share.share)));
		this.activePlanId = planManager.activePlanId;
		this.activeFolderId = planManager.activeFolderId;
		this.allShares = visitedShares.visitedShares;
		this.activeShareId = activeShare.shareId;
	}

	public ngOnDestroy(): void
	{
		this.hotkeyRegistration?.unregister();
		this.hotkeyRegistration = null;
		this.stopAutoScroll();
	}

	/**
	 * What the Plans hotkeys run. The tree has no selected row of its own -
	 * the open plan is the selection - so these are the entries of the menus
	 * that plan and its folder would show. Creating comes last as a fallback:
	 * with no folder open a new plan or folder goes to the top level.
	 */
	public hotkeyItems(): HotkeyItem[]
	{
		// Importing is not about any one plan, so it stands outside the
		// read-only gate below.
		const items: HotkeyItem[] = [
			{hotkey: 'plans.importOldTools', action: () => this.openImportDialog()},
		];
		if (this.planManager.activePlanReadOnly()) {
			return items;
		}
		const folder = this.planManager.activeFolder();
		if (folder) {
			items.push(...new FolderContextMenu(folder.id, folder.name, this).getItems());
		}
		const plan = this.planManager.activePlan();
		if (plan) {
			items.push(...new PlanContextMenu(plan, this.planNames.displayName(plan), this).getItems());
		}
		items.push(
			{hotkey: 'plans.newPlan', action: () => this.startCreatePlan(this.currentFolderId())},
			{hotkey: 'plans.newFolder', action: () => this.startCreateFolder(this.currentFolderId())},
		);
		return items;
	}

	// ── Sharing ─────────────────────────────────────────────────────────────

	/**
	 * Everything that shares opens the same window (see PlanShareDialogComponent): it
	 * offers the plan's own link and a frozen snapshot link, and knows which of the two
	 * a given row can have.
	 */
	public sharePlan(plan: Plan): void
	{
		this.shareDialog.open({type: 'plan', id: plan.id, name: this.planNames.displayName(plan), device: false});
	}

	public shareFolder(id: string, name: string): void
	{
		this.shareDialog.open({type: 'folder', id, name, device: false});
	}

	/** "On this device" rows: their plans exist nowhere but this browser, so only snapshots. */
	public shareLocalItem(id: string, kind: 'plan' | 'folder', name: string): void
	{
		this.shareDialog.open({type: kind, id, name, device: true});
	}

	// ── Import from old Satisfactory Tools ──────────────────────────────────

	public openImportDialog(): void
	{
		this.importDialogOpenSignal.set(true);
	}

	public closeImportDialog(): void
	{
		this.importDialogOpenSignal.set(false);
	}

	/** Files the imported plans into a fresh "Import ([datetime])" folder. */
	public onImportApply(plans: Plan[]): void
	{
		this.importDialogOpenSignal.set(false);
		if (plans.length === 0) {
			return;
		}
		const folder: Folder = {
			id: crypto.randomUUID(),
			name: `Import (${this.formatImportTimestamp(new Date())})`,
			parentId: null,
			settings: null,
			fixedGroups: [],
			resourcePool: false,
			revision: null,
		};
		this.planManager.importTree([folder], plans.map(plan => ({...plan, folderId: folder.id})));
		this.planManager.setActiveFolder(folder.id);
		this.notifications.showSuccess(`Imported ${plans.length} plan${plans.length === 1 ? '' : 's'} into "${folder.name}".`);
	}

	private formatImportTimestamp(date: Date): string
	{
		const pad = (value: number): string => String(value).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	/** Icon hash for a plan row; null falls back to the generic file icon. */
	public planIconHash(plan: Plan): string | null
	{
		return this.planIcons.iconHash(plan);
	}

	/** Shown name for a plan row - its own name, or a product-derived default. */
	public planDisplayName(plan: Plan): string
	{
		return this.planNames.displayName(plan);
	}

	public pickPlanIcon(plan: Plan): void
	{
		this.iconPickerPlanIdSignal.set(plan.id);
	}

	public resetPlanIcon(plan: Plan): void
	{
		this.planManager.setPlanIcon(plan.id, null);
	}

	public onIconPicked(iconClassName: string): void
	{
		const planId = this.iconPickerPlanIdSignal();
		if (planId !== null) {
			this.planManager.setPlanIcon(planId, iconClassName);
		}
		this.iconPickerPlanIdSignal.set(null);
	}

	/** Clear the override so the plan falls back to its default (product) icon. */
	public onIconNone(): void
	{
		const planId = this.iconPickerPlanIdSignal();
		if (planId !== null) {
			this.planManager.setPlanIcon(planId, null);
		}
		this.iconPickerPlanIdSignal.set(null);
	}

	public closeIconPicker(): void
	{
		this.iconPickerPlanIdSignal.set(null);
	}

	public onFolderContextMenu(event: MouseEvent, folderId: string, folderName: string): void
	{
		event.preventDefault();
		event.stopPropagation();
		this.contextMenu.open(new FolderContextMenu(folderId, folderName, this), event.clientX, event.clientY);
	}

	public onPlanContextMenu(event: MouseEvent, plan: Plan): void
	{
		event.preventDefault();
		event.stopPropagation();
		this.contextMenu.open(new PlanContextMenu(plan, this.planNames.displayName(plan), this), event.clientX, event.clientY);
	}

	public ngAfterViewChecked(): void
	{
		if (this.needsFocus && this.editInputRef) {
			this.editInputRef.nativeElement.focus();
			this.editInputRef.nativeElement.select();
			this.needsFocus = false;
		}
	}

	public toggleCollapse(id: string): void
	{
		this.foldState.toggle(id);
	}

	public toggleRoot(): void
	{
		this.toggleCollapse(ROOT_ID);
	}

	public toggleLocal(): void
	{
		this.toggleCollapse(LOCAL_ID);
	}

	public toggleShared(): void
	{
		this.toggleCollapse(SHARED_ID);
	}

	// ── Shared plans (visited share links) ──────────────────────────────────

	/**
	 * Opens the share in its version's planner (the version was auto-added on
	 * first visit). The row of the already-open share is its root plan - like
	 * any plan row, clicking it selects that plan (back from a subplan).
	 */
	public openVisitedShare(share: VisitedShare): void
	{
		if (this.activeShareId() === share.share) {
			const root = this.activeShare.rootPlan();
			if (root !== null) {
				this.planManager.setActivePlan(root.id);
			}
			return;
		}
		this.navigateToShare(share);
	}

	private navigateToShare(share: VisitedShare): void
	{
		const version = this.versionManager.versions().find(v => v.id === share.version.id);
		if (version) {
			void this.router.navigate(['/', this.versionManager.urlSlug(version), 'planner', 'shared', share.share]);
		} else {
			// The version left the list since the visit - the public entry
			// point re-adds it before forwarding into the planner.
			void this.router.navigate(['/shared', share.share]);
		}
	}

	/** Shown name of a visited-share row - an unnamed shared plan gets the usual fallback. */
	public visitedShareName(share: VisitedShare): string
	{
		return share.type === 'plan' ? this.planNames.displayNameOf(share.name) : share.name;
	}

	/**
	 * Icon of a visited-share row. A plan share's row IS its plan, so it shows
	 * the plan's icon: the hydrated plan's while the share is open, else the
	 * class name from the visit-time entry or the tree snapshot (resolved
	 * against the active version's data - item icons are stable across
	 * versions). Null falls back to the generic type icon.
	 */
	public visitedShareIconHash(share: VisitedShare): string | null
	{
		if (share.type !== 'plan') {
			return null;
		}
		if (share.share === this.activeShareId()) {
			const plan = this.activeShare.rootPlan();
			if (plan !== null) {
				return this.planIcons.iconHash(plan);
			}
		}
		const className = share.iconClassName !== undefined ? share.iconClassName : this.shareTrees.treeOf(share.share)?.iconClassName ?? null;
		return className === null ? null : this.versionManager.activeVersionData()?.iconForClassName(className) ?? null;
	}

	public sharedTreeItemsOf(shareId: string): SharedTreeItem[]
	{
		return this.sharedTreeItemsByShare().get(shareId) ?? [];
	}

	public shareHasChildren(shareId: string): boolean
	{
		return (this.shareTrees.treeOf(shareId)?.children.length ?? 0) > 0;
	}

	/** A shared tree row is the active one while its share is open and its hydrated plan is selected. */
	public isSharedRowActive(share: VisitedShare, item: SharedTreeItem): boolean
	{
		return share.share === this.activeShareId() && this.activeShare.hydratedPlanId(item.payloadId) === this.activePlanId();
	}

	public isSharedRowAncestor(share: VisitedShare, item: SharedTreeItem): boolean
	{
		return share.share === this.activeShareId() && this.sharedAncestorPayloadIds().has(item.payloadId);
	}

	/** Selects a plan of a share (read-only) - opening the share first when it is not the open one. */
	public selectSharedTreePlan(share: VisitedShare, item: SharedTreeItem): void
	{
		this.activeShare.selectPlan(share.share, item.payloadId);
		if (this.activeShareId() !== share.share) {
			this.navigateToShare(share);
		}
	}

	/** Whether the open share's list row is expanded to show its tree (collapse keyed by share id, like any node). */
	public isShareExpanded(shareId: string): boolean
	{
		return this.foldState.isOpen(shareId);
	}

	public onVisitedShareContextMenu(event: MouseEvent, share: VisitedShare): void
	{
		event.preventDefault();
		event.stopPropagation();
		this.contextMenu.open(new VisitedShareContextMenu(share, this.visitedShareName(share), this), event.clientX, event.clientY);
	}

	public copyShareLink(share: VisitedShare): void
	{
		navigator.clipboard.writeText(`${window.location.origin}/shared/${share.share}`)
			.then(() => this.notifications.showSuccess('Share link copied.'))
			.catch(() => this.notifications.show('Could not copy the share link.'));
	}

	public isShareVersionActive(share: VisitedShare): boolean
	{
		return this.activeShare.isShareVersionActive(share.version.id);
	}

	public addShareToMyPlans(share: VisitedShare): void
	{
		this.activeShare.addToMyPlans(share.share);
	}

	public onSharedDragStart(event: DragEvent, share: VisitedShare): void
	{
		this.dragItem = {type: share.type, id: share.share, source: 'shared', versionId: share.version.id};
		event.dataTransfer!.effectAllowed = 'copy';
	}

	// ── Plans on this device ────────────────────────────────────────────────

	/** Opens a device plan read-only, so it can be checked before it is moved into the account. Folder rows are labels only. */
	public selectLocalItem(item: LocalItem): void
	{
		if (item.kind === 'plan') {
			this.planManager.setActivePlan(item.id);
		}
	}

	public onLocalContextMenu(event: MouseEvent, item: LocalItem): void
	{
		event.preventDefault();
		event.stopPropagation();
		this.contextMenu.open(new LocalItemContextMenu(item.id, item.kind, item.name, this), event.clientX, event.clientY);
	}

	public addLocalToMyPlans(id: string, kind: 'plan' | 'folder', folderId: string | null = null): void
	{
		this.planManager.moveLocalToAccount(id, kind, folderId);
		this.notifications.showSuccess('Moved to your plans.');
	}

	/** Non-destructive: the share itself is permanent, reopening the link restores the entry. */
	public removeVisitedShare(share: VisitedShare): void
	{
		const wasOpen = this.activeShareId() === share.share;
		this.visitedShares.remove(share.share);
		if (wasOpen) {
			const version = this.versionManager.activeVersion();
			if (version) {
				void this.router.navigate(['/', this.versionManager.urlSlug(version), 'planner']);
			}
		}
	}

	public selectPlan(plan: Plan): void
	{
		this.planManager.setActivePlan(plan.id);
	}

	public selectFolder(id: string): void
	{
		this.planManager.setActiveFolder(id);
	}

	/**
	 * Where a new plan or folder lands: the selected folder, or the folder
	 * holding the selected plan - a subplan hands over its root plan's. Null
	 * (the top of the tree) when nothing is selected, or when what is
	 * selected is read-only and so lives outside the user's own tree.
	 */
	public currentFolderId(): string | null
	{
		const folder = this.planManager.activeFolder();
		if (folder !== null) {
			return folder.id;
		}
		const plan = this.planManager.activePlan();
		if (plan === null || this.planManager.activePlanReadOnly()) {
			return null;
		}
		return this.rootPlanOf(plan).folderId;
	}

	/** A subplan sits under its parent plan, so the folder it counts as being in is the root plan's. */
	private rootPlanOf(plan: Plan): Plan
	{
		let current = plan;
		const seen = new Set<string>([current.id]);
		while (current.parentPlanId !== null) {
			const parent = this.planManager.findPlan(current.parentPlanId);
			// A dangling or looping parent id would otherwise spin forever.
			if (parent === null || seen.has(parent.id)) {
				break;
			}
			seen.add(parent.id);
			current = parent;
		}
		return current;
	}

	public startCreateFolder(parentId: string | null): void
	{
		this.expandFolder(parentId);
		this.editValue = '';
		this.editStateSignal.set({mode: 'new-folder', targetId: null, parentId});
		this.needsFocus = true;
	}

	/**
	 * Plans are created unnamed and selected straight away - no inline edit box.
	 * Their shown name is derived from their products until the user renames them.
	 */
	public startCreatePlan(parentId: string | null): void
	{
		this.expandFolder(parentId);
		const plan = this.planManager.createPlan('', parentId);
		this.planManager.setActivePlan(plan.id);
	}

	/** A collapsed folder would hide the new row / inline input added inside it. */
	private expandFolder(folderId: string | null): void
	{
		if (folderId === null) {
			return;
		}
		this.foldState.set(folderId, true);
	}

	/** The clone lands next to the original and becomes active, ready to work in. */
	public cloneFolder(id: string): void
	{
		const clone = this.planManager.cloneFolder(id);
		if (clone) {
			this.planManager.setActiveFolder(clone.id);
		}
	}

	public clonePlan(plan: Plan, displayName: string): void
	{
		const clone = this.planManager.clonePlan(plan.id, displayName);
		if (clone) {
			this.planManager.setActivePlan(clone.id);
		}
	}

	public startRenameFolder(id: string, currentName: string): void
	{
		this.editValue = currentName;
		this.editStateSignal.set({mode: 'rename-folder', targetId: id, parentId: null});
		this.needsFocus = true;
	}

	public startRenamePlan(id: string, currentName: string): void
	{
		this.editValue = currentName;
		this.editStateSignal.set({mode: 'rename-plan', targetId: id, parentId: null});
		this.needsFocus = true;
	}

	public commitEdit(): void
	{
		const state = this.editState();
		if (!state) return;
		const value = this.editValue.trim();

		if (value) {
			switch (state.mode) {
				case 'new-folder': {
					const folder = this.planManager.createFolder(value, state.parentId);
					this.planManager.setActiveFolder(folder.id);
					break;
				}
				case 'new-plan': {
					const plan = this.planManager.createPlan(value, state.parentId);
					this.planManager.setActivePlan(plan.id);
					break;
				}
				case 'rename-folder':
					if (state.targetId) this.planManager.renameFolder(state.targetId, value);
					break;
				case 'rename-plan':
					if (state.targetId) this.planManager.renamePlan(state.targetId, value);
					break;
			}
		}

		this.cancelEdit();
	}

	public cancelEdit(): void
	{
		this.editStateSignal.set(null);
		this.editValue = '';
	}

	public onEditKeydown(event: KeyboardEvent): void
	{
		if (event.key === 'Enter') {
			event.preventDefault();
			this.commitEdit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			this.cancelEdit();
		}
	}

	public deleteFolder(id: string, name: string): void
	{
		if (!confirm(`Delete folder "${name}" and everything inside it?`)) return;
		this.planManager.deleteFolder(id);
	}

	public deletePlan(plan: Plan): void
	{
		const name = this.planNames.displayName(plan);
		const message = plan.parentPlanId !== null
			? `Delete subplan "${name}"? Its node is also removed from the parent plan.`
			: `Delete plan "${name}"?`;
		if (!confirm(message)) return;
		this.planManager.deletePlan(plan.id);
	}

	public buildTree(): PlanTree
	{
		return this.planManager.planTree();
	}

	// Drag-and-drop: moving between parents and reordering among siblings

	public onDragStart(event: DragEvent, type: 'plan' | 'folder', id: string): void
	{
		this.dragItem = {type, id, source: 'account'};
		event.dataTransfer!.effectAllowed = 'move';
	}

	/**
	 * A local subplan row is not draggable, but an icon inside it can still
	 * start a native drag that bubbles here - swallow it so the subplan cannot
	 * be migrated apart from its parent plan.
	 */
	public onLocalDragStart(event: DragEvent, item: LocalItem): void
	{
		if (item.isSubplan) {
			event.preventDefault();
			return;
		}
		this.dragItem = {type: item.kind, id: item.id, source: 'local'};
		event.dataTransfer!.effectAllowed = 'move';
	}

	/**
	 * The pointer's place within the row decides the drop: the outer quarters
	 * of a folder row (halves of a plan row) insert before/after it, the
	 * middle of a folder row drops inside. The root header only takes "inside".
	 * Rows that would not accept the dragged item are not marked and the
	 * browser shows the drop as forbidden.
	 */
	public onDragOver(event: DragEvent, targetId: string, kind: 'root' | 'folder' | 'plan'): void
	{
		if (!this.dragItem) return;
		if (!this.dropAllowed(this.dragItem, targetId, kind)) {
			this.onDragLeave(event, targetId);
			return;
		}
		event.preventDefault();
		event.dataTransfer!.dropEffect = this.dragItem.source === 'shared' ? 'copy' : 'move';
		this.dropTargetSignal.set({
			id: targetId,
			position: this.dragItem.source === 'account'
				? this.positionAt(event.currentTarget as HTMLElement, event.clientY, kind, this.insideAllowed(this.dragItem, kind))
				: 'inside',
		});
	}

	public onDragLeave(event: DragEvent, targetId: string): void
	{
		if (this.dropTarget()?.id === targetId) {
			this.dropTargetSignal.set(null);
		}
	}

	/** Position of the current drag over the given row, or null when it hovers elsewhere. */
	public dropPositionOf(id: string): DropPosition | null
	{
		const target = this.dropTarget();
		return target?.id === id ? target.position : null;
	}

	public onDrop(event: DragEvent, target: TreeItem | null): void
	{
		event.preventDefault();
		this.performDrop(target);
	}

	private performDrop(target: TreeItem | null): void
	{
		const drop = this.dropTarget();
		this.dropTargetSignal.set(null);
		const item = this.dragItem;
		this.dragItem = null;
		if (!item) return;

		// A local or shared row dropped onto the account tree lands in the
		// folder the target row stands for (a plan row = its folder), last.
		if (item.source !== 'account') {
			const folderId = this.crossSectionFolder(target);
			if (folderId === undefined) return;
			if (item.source === 'local') {
				this.addLocalToMyPlans(item.id, item.type, folderId);
			} else {
				this.activeShare.addToMyPlans(item.id, folderId);
			}
			return;
		}

		if (target === null || target.type === 'input') {
			if (this.dropAllowed(item, ROOT_ID, 'root')) {
				this.dropInto(item, null);
			}
			return;
		}
		if (!this.dropAllowed(item, target.type === 'plan' ? target.plan.id : target.id, target.type)) {
			return;
		}
		const position = drop?.position ?? 'inside';
		if (target.type === 'folder' && position === 'inside') {
			if (item.id !== target.id) {
				this.dropInto(item, target.id);
			}
			return;
		}
		// Dropped on the middle of a plan row: the dragged plan becomes that
		// plan's subplan (and gets a node in its graph - see PlanManager).
		if (target.type === 'plan' && position === 'inside' && item.type === 'plan') {
			if (this.confirmPlanMove(item.id, null, target.plan.id)) {
				this.planManager.placePlan(item.id, null, target.plan.id, null);
			}
			return;
		}
		this.dropBeside(item, target, position === 'after');
	}

	public onDragEnd(): void
	{
		this.dragItem = null;
		this.dropTargetSignal.set(null);
		this.touchDragIdSignal.set(null);
		this.stopAutoScroll();
	}

	// Touch drag-and-drop: the same moves, held with a finger

	/**
	 * A finger picked up an account row. The row is only marked here - the
	 * drag itself starts with the first move, which is also what tells the
	 * context menu opened by the same long press to get out of the way.
	 */
	public onTouchDragPick(type: 'plan' | 'folder', id: string): void
	{
		this.dragItem = {type, id, source: 'account'};
		this.touchDragIdSignal.set(id);
	}

	public onLocalTouchDragPick(item: LocalItem): void
	{
		this.dragItem = {type: item.kind, id: item.id, source: 'local'};
		this.touchDragIdSignal.set(item.id);
	}

	public onSharedTouchDragPick(share: VisitedShare): void
	{
		this.dragItem = {type: share.type, id: share.share, source: 'shared', versionId: share.version.id};
		this.touchDragIdSignal.set(share.share);
	}

	/** Follows the finger: marks the row under it and scrolls the list at its edges. */
	public onTouchDragMove(touch: Touch): void
	{
		if (!this.dragItem) {
			return;
		}
		this.contextMenu.close();
		this.touchPoint = {x: touch.clientX, y: touch.clientY};
		this.updateTouchDropTarget();
		this.updateAutoScroll(touch.clientY);
	}

	public onTouchDragDrop(touch: Touch): void
	{
		this.stopAutoScroll();
		const hit = this.rowUnder(touch.clientX, touch.clientY);
		const item = this.dragItem;
		this.touchDragIdSignal.set(null);
		if (!item || !hit) {
			this.onDragEnd();
			return;
		}
		if (hit.kind === 'root') {
			this.performDrop(null);
			return;
		}
		const target = this.treeItems().find(row => row.type !== 'input' && (row.type === 'plan' ? row.plan.id : row.id) === hit.id);
		if (!target) {
			this.onDragEnd();
			return;
		}
		this.performDrop(target);
	}

	public onTouchDragCancel(): void
	{
		this.onDragEnd();
	}

	/** Marks the row under the finger, the way dragover does for a mouse drag. */
	private updateTouchDropTarget(): void
	{
		const item = this.dragItem;
		const point = this.touchPoint;
		if (!item || !point) {
			return;
		}
		const hit = this.rowUnder(point.x, point.y);
		if (!hit || !this.dropAllowed(item, hit.id, hit.kind)) {
			this.dropTargetSignal.set(null);
			return;
		}
		this.dropTargetSignal.set({
			id: hit.id,
			position: item.source === 'account'
				? this.positionAt(hit.element, point.y, hit.kind, this.insideAllowed(item, hit.kind))
				: 'inside',
		});
	}

	/** The drop row under a point, found the way the browser finds a dragover target. */
	private rowUnder(x: number, y: number): {id: string; kind: 'root' | 'folder' | 'plan'; element: HTMLElement} | null
	{
		const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-id]') ?? null;
		const id = element?.dataset['dropId'];
		const kind = element?.dataset['dropKind'];
		if (!element || !id || !kind) {
			return null;
		}
		return {id, kind: kind as 'root' | 'folder' | 'plan', element};
	}

	/**
	 * A finger cannot reach a row that is off screen, so the list scrolls
	 * itself while the drag sits near its top or bottom edge. The row under
	 * the finger is re-checked on every step - the list moves, the finger
	 * does not.
	 */
	private updateAutoScroll(clientY: number): void
	{
		const container = this.scrollContainer();
		if (!container) {
			return;
		}
		const rect = container.getBoundingClientRect();
		const speed = clientY - rect.top < AUTO_SCROLL_EDGE
			? -AUTO_SCROLL_STEP
			: rect.bottom - clientY < AUTO_SCROLL_EDGE ? AUTO_SCROLL_STEP : 0;
		if (speed === 0) {
			this.stopAutoScroll();
			return;
		}
		this.autoScrollSpeed = speed;
		if (this.autoScrollTimer === null) {
			this.autoScrollTimer = setInterval(() => {
				container.scrollTop += this.autoScrollSpeed;
				this.updateTouchDropTarget();
			}, AUTO_SCROLL_INTERVAL_MS);
		}
	}

	private stopAutoScroll(): void
	{
		if (this.autoScrollTimer !== null) {
			clearInterval(this.autoScrollTimer);
			this.autoScrollTimer = null;
		}
		this.touchPoint = null;
	}

	/** The panel area the tree scrolls in - a docked panel, a floating window or the mobile view. */
	private scrollContainer(): HTMLElement | null
	{
		let element: HTMLElement | null = this.elementRef.nativeElement.parentElement;
		while (element) {
			const overflow = getComputedStyle(element).overflowY;
			if (overflow === 'auto' || overflow === 'scroll') {
				return element;
			}
			element = element.parentElement;
		}
		return null;
	}

	/**
	 * Plans go anywhere: beside or inside a folder, beside or inside another
	 * plan (which makes them its subplan), and out of a plan again. The one
	 * thing they cannot do is land inside themselves or one of their own
	 * subplans. Folders keep out of plans entirely - nothing but a plan can
	 * sit between subplans. Dropping a row onto itself is a no-op.
	 */
	private dropAllowed(item: DragItem, targetId: string, kind: 'root' | 'folder' | 'plan'): boolean
	{
		// Rows coming INTO the account tree land in a folder: any folder, the
		// root, or a top-level plan's folder. Shares are version-scoped.
		if (item.source !== 'account') {
			if (item.source === 'shared' && !this.activeShare.isShareVersionActive(item.versionId ?? '')) {
				return false;
			}
			return kind !== 'plan' || this.planManager.plans().some(p => p.id === targetId && p.parentPlanId === null);
		}
		if (targetId === item.id) {
			return false;
		}
		if (kind !== 'plan') {
			return true;
		}
		const target = this.planManager.plans().find(p => p.id === targetId);
		if (item.type === 'folder') {
			return target !== undefined && target.parentPlanId === null;
		}
		return target !== undefined && !this.isInsidePlan(target.id, item.id);
	}

	/** Whether the plan is the given one or one of its subplans, at any depth. */
	private isInsidePlan(planId: string, ancestorId: string): boolean
	{
		const plans = this.planManager.plans();
		const seen = new Set<string>();
		let current: string | null = planId;
		while (current !== null && !seen.has(current)) {
			if (current === ancestorId) {
				return true;
			}
			seen.add(current);
			current = plans.find(p => p.id === current)?.parentPlanId ?? null;
		}
		return false;
	}

	/** A plan row takes an "inside" drop (= become its subplan) only from another plan. */
	private insideAllowed(item: DragItem, kind: 'root' | 'folder' | 'plan'): boolean
	{
		return kind !== 'plan' || item.type === 'plan';
	}

	private positionAt(row: HTMLElement, clientY: number, kind: 'root' | 'folder' | 'plan', insideAllowed: boolean): DropPosition
	{
		if (kind === 'root') {
			return 'inside';
		}
		const fraction = (clientY - row.getBoundingClientRect().top) / Math.max(1, row.offsetHeight);
		if (!insideAllowed) {
			return fraction < 0.5 ? 'before' : 'after';
		}
		return fraction < 0.25 ? 'before' : fraction > 0.75 ? 'after' : 'inside';
	}

	/**
	 * The folder a cross-section drop lands in: the folder row itself, the
	 * root header (null), or a top-level plan row's folder. Undefined for rows
	 * that take no such drop (subplans - they have no folder).
	 */
	private crossSectionFolder(target: TreeItem | null): string | null | undefined
	{
		if (target === null || target.type === 'input') {
			return null;
		}
		if (target.type === 'folder') {
			return target.id;
		}
		return target.plan.parentPlanId === null ? target.plan.folderId : undefined;
	}

	/** Appends the dragged item to the folder (null = root). */
	private dropInto(item: {type: 'plan' | 'folder'; id: string}, folderId: string | null): void
	{
		if (item.type === 'plan') {
			if (this.confirmPlanMove(item.id, folderId, null)) {
				this.planManager.movePlan(item.id, folderId);
			}
		} else if (this.confirmFolderMove(item.id, folderId)) {
			this.planManager.moveFolder(item.id, folderId);
		}
	}

	/**
	 * Inserts the dragged item right before/after the target row. Folders and
	 * plans of one level share a single order, so a plan dropped beside a
	 * folder row (or a folder beside a plan row) lands exactly there. Beside a
	 * subplan only plans can land, among that parent's subplans.
	 */
	private dropBeside(item: {type: 'plan' | 'folder'; id: string}, target: FolderItem | PlanItem, after: boolean): void
	{
		// Beside a subplan: only plans can land there, joining that parent's
		// subplans (a plan dragged in from elsewhere included).
		if (target.type === 'plan' && target.plan.parentPlanId !== null) {
			const targetPlan = target.plan;
			if (item.type !== 'plan') {
				this.dropInto(item, this.planManager.folderIdOfPlan(targetPlan));
				return;
			}
			const siblings = this.planManager.siblingPlans(targetPlan.folderId, targetPlan.parentPlanId).filter(p => p.id !== item.id);
			const index = siblings.findIndex(p => p.id === targetPlan.id);
			if (this.confirmPlanMove(item.id, targetPlan.folderId, targetPlan.parentPlanId)) {
				this.planManager.placePlan(item.id, targetPlan.folderId, targetPlan.parentPlanId, index < 0 ? null : index + (after ? 1 : 0));
			}
			return;
		}

		// Beside a folder or top-level plan: folders and plans share one
		// position sequence per level, so either kind lands exactly there.
		const targetId = target.type === 'folder' ? target.id : target.plan.id;
		const folderId = target.type === 'folder'
			? this.planManager.folders().find(f => f.id === target.id)?.parentId ?? null
			: target.plan.folderId;
		const siblings = this.planManager.siblingEntries(folderId).filter(e => e.id !== item.id);
		const index = siblings.findIndex(e => e.id === targetId);
		const position = index < 0 ? null : index + (after ? 1 : 0);
		if (item.type === 'folder') {
			if (this.confirmFolderMove(item.id, folderId)) {
				this.planManager.placeFolder(item.id, folderId, position);
			}
		} else if (this.confirmPlanMove(item.id, folderId, null)) {
			this.planManager.placePlan(item.id, folderId, null, position);
		}
	}

	/** Entering a folder that fixes settings groups overwrites the plan's copies - ask once. */
	private confirmPlanMove(planId: string, folderId: string | null, parentPlanId: string | null): boolean
	{
		const plans = this.planManager.plans();
		const plan = plans.find(p => p.id === planId);
		if (!plan) {
			return false;
		}
		const parent = parentPlanId === null ? null : plans.find(p => p.id === parentPlanId) ?? null;
		const targetFolderId = parent ? this.planManager.folderIdOfPlan(parent) : folderId;
		const fixed = this.planManager.fixedFolderForFolder(targetFolderId);
		if (!fixed || fixed.id === this.planManager.fixedFolderOf(plan)?.id) {
			return true;
		}
		const groups = fixed.fixedGroups.map(group => SettingsGroups.labelOf(group)).join(', ');
		return confirm(`Move "${this.planNames.displayName(plan)}" into "${fixed.name}"? Its ${groups} settings are replaced by the settings fixed by the folder.`);
	}

	/** A folder with custom settings loses them under a folder that fixes settings groups - ask once. */
	private confirmFolderMove(folderId: string, newParentId: string | null): boolean
	{
		const folders = this.planManager.folders();
		const fixed = this.planManager.fixedFolderForFolder(newParentId);
		if (!fixed || fixed.id === folderId) {
			return true;
		}
		const moved = folders.find(f => f.id === folderId);
		const withSettings = folders.filter(f => f.settings !== null && (f.id === folderId || this.isInside(f, folderId, folders)));
		if (!moved || withSettings.length === 0) {
			return true;
		}
		const names = withSettings.map(f => `"${f.name}"`).join(', ');
		return confirm(`Move "${moved.name}" into "${fixed.name}"? ${names} ${withSettings.length === 1 ? 'loses its' : 'lose their'} custom settings - `
			+ `"${fixed.name}" sets the settings for everything inside it.`);
	}

	private isInside(folder: Folder, ancestorId: string, folders: Folder[]): boolean
	{
		const seen = new Set<string>();
		let id = folder.parentId;
		while (id !== null && !seen.has(id)) {
			if (id === ancestorId) {
				return true;
			}
			seen.add(id);
			id = folders.find(f => f.id === id)?.parentId ?? null;
		}
		return false;
	}

}
