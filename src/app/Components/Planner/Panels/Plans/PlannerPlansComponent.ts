import {AfterViewChecked, Component, ElementRef, Signal, ViewChild, ChangeDetectionStrategy, computed, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {faCaretDown, faCaretRight, faEllipsisVertical, faFileLines, faFolder, faFolderOpen, faFolderPlus, faPlus} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {IconPickerDialogComponent} from '@src/Components/Common/IconPickerDialogComponent';
import {TruncateTitleDirective} from '@src/Components/Common/TruncateTitleDirective';
import {PlannerContextMenuService} from '@src/Components/Planner/ContextMenu/PlannerContextMenuService';
import {FolderContextMenu} from '@src/Components/Planner/Panels/Plans/FolderContextMenu';
import {PlanContextMenu} from '@src/Components/Planner/Panels/Plans/PlanContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';
import {ShareLinkDialogComponent} from '@src/Components/Planner/Panels/Plans/ShareLinkDialogComponent';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';
import {AuthService} from '@src/Model/Auth/AuthService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanTree} from '@src/Model/Planner/PlanTree';
import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';

interface FolderItem
{
	readonly type: 'folder';
	readonly depth: number;
	readonly id: string;
	readonly name: string;
	readonly isOpen: boolean;
	readonly isEditing: boolean;
}

interface PlanItem
{
	readonly type: 'plan';
	readonly depth: number;
	readonly plan: Plan;
	readonly isEditing: boolean;
	readonly hasSubplans: boolean;
	readonly isOpen: boolean;
}

interface InputItem
{
	readonly type: 'input';
	readonly depth: number;
	readonly mode: 'folder' | 'plan';
	readonly parentId: string | null;
}

type TreeItem = FolderItem | PlanItem | InputItem;

/** A read-only row in the "Local plans" migration section. */
interface LocalItem
{
	readonly kind: 'folder' | 'plan';
	readonly depth: number;
	readonly id: string;
	readonly name: string;
	readonly iconHash: string | null;
}

interface EditState
{
	readonly mode: 'new-folder' | 'new-plan' | 'rename-folder' | 'rename-plan';
	readonly targetId: string | null;
	readonly parentId: string | null;
}

const ROOT_ID = '__root__';
const LOCAL_ID = '__local__';

@Component({
	selector: 'planner-plans',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerPlansComponent.html',
	styleUrl: './PlannerPlansComponent.scss',
	imports: [FormsModule, FaIconComponent, TooltipDirective, GameIconComponent, IconPickerDialogComponent, ShareLinkDialogComponent, TruncateTitleDirective],
})
export class PlannerPlansComponent implements AfterViewChecked, PlanTreeMenuHost
{

	public readonly faCaretDown = faCaretDown;
	public readonly faCaretRight = faCaretRight;
	public readonly faEllipsisVertical = faEllipsisVertical;
	public readonly faFileLines = faFileLines;
	public readonly faFolder = faFolder;
	public readonly faFolderOpen = faFolderOpen;
	public readonly faFolderPlus = faFolderPlus;
	public readonly faPlus = faPlus;

	public readonly activePlanId: Signal<string | null>;
	public readonly activeFolderId: Signal<string | null>;

	private readonly collapsedSignal = signal(new Set<string>());
	private readonly editStateSignal = signal<EditState | null>(null);
	public readonly editState: Signal<EditState | null> = this.editStateSignal.asReadonly();
	public editValue: string = '';

	private needsFocus = false;
	private dragItem: {type: 'plan' | 'folder'; id: string; source: 'account' | 'local'} | null = null;

	private readonly dragOverIdSignal = signal<string | null>(null);
	public readonly dragOverId: Signal<string | null> = this.dragOverIdSignal.asReadonly();

	@ViewChild('editInput') private editInputRef?: ElementRef<HTMLInputElement>;

	public readonly treeItems: Signal<TreeItem[]> = computed(() => {
		const tree = this.planManager.planTree();
		const collapsed = this.collapsedSignal();
		const editing = this.editStateSignal();
		const items: TreeItem[] = [];

		if (collapsed.has(ROOT_ID)) return items;

		const isFolderEditing = (id: string): boolean =>
			editing?.mode === 'rename-folder' && editing.targetId === id;
		const isPlanEditing = (id: string): boolean =>
			editing?.mode === 'rename-plan' && editing.targetId === id;

		if (editing?.parentId === null && (editing.mode === 'new-folder' || editing.mode === 'new-plan')) {
			items.push({type: 'input', depth: 0, mode: editing.mode === 'new-folder' ? 'folder' : 'plan', parentId: null});
		}

		const addPlan = (node: PlanTreePlan, depth: number): void => {
			const isOpen = !collapsed.has(node.plan.id);
			items.push({
				type: 'plan',
				depth,
				plan: node.plan,
				isEditing: isPlanEditing(node.plan.id),
				hasSubplans: node.subplans.length > 0,
				isOpen,
			});
			if (!isOpen) return;

			node.subplans.forEach(sub => addPlan(sub, depth + 1));
		};

		const addFolder = (node: PlanTreeFolder, depth: number): void => {
			const isOpen = !collapsed.has(node.folder.id);
			items.push({type: 'folder', depth, id: node.folder.id, name: node.folder.name, isOpen, isEditing: isFolderEditing(node.folder.id)});
			if (!isOpen) return;

			if (editing && editing.parentId === node.folder.id && (editing.mode === 'new-folder' || editing.mode === 'new-plan')) {
				items.push({type: 'input', depth: depth + 1, mode: editing.mode === 'new-folder' ? 'folder' : 'plan', parentId: node.folder.id});
			}

			node.children.forEach(child => addFolder(child, depth + 1));
			node.plans.forEach(p => addPlan(p, depth + 1));
		};

		tree.rootFolders.forEach(f => addFolder(f, 0));
		tree.rootPlans.forEach(p => addPlan(p, 0));

		return items;
	});

	public readonly rootOpen: Signal<boolean> = computed(() => !this.collapsedSignal().has(ROOT_ID));
	public readonly localOpen: Signal<boolean> = computed(() => !this.collapsedSignal().has(LOCAL_ID));

	/** Shown while signed in AND this device still has local plans to migrate. */
	public readonly showLocalSection: Signal<boolean> = computed(() =>
		this.planManager.isAuthenticated() && this.localTreeItems().length > 0);

	/** Flattened, always-expanded, read-only rows of this device's local plans. */
	public readonly localTreeItems: Signal<LocalItem[]> = computed(() => {
		const tree = this.planManager.localPlanTree();
		const items: LocalItem[] = [];
		const addPlan = (node: PlanTreePlan, depth: number): void => {
			items.push({kind: 'plan', depth, id: node.plan.id, name: this.planNames.displayName(node.plan), iconHash: this.planIcons.iconHash(node.plan)});
			node.subplans.forEach(sub => addPlan(sub, depth + 1));
		};
		const addFolder = (node: PlanTreeFolder, depth: number): void => {
			items.push({kind: 'folder', depth, id: node.folder.id, name: node.folder.name, iconHash: null});
			node.children.forEach(child => addFolder(child, depth + 1));
			node.plans.forEach(p => addPlan(p, depth + 1));
		};
		tree.rootFolders.forEach(f => addFolder(f, 0));
		tree.rootPlans.forEach(p => addPlan(p, 0));
		return items;
	});

	/**
	 * Ids of every folder and plan on the path from the root to the active
	 * plan (subplan parents first, then the folder chain) - highlighted so
	 * the tree always shows where the selection lives.
	 */
	public readonly activeAncestorIds: Signal<Set<string>> = computed(() => {
		const ids = new Set<string>();
		const plans = this.planManager.plans();
		const folders = this.planManager.folders();

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

	/** The freshly created share link shown in the dialog, or null when closed. */
	private readonly shareLinkSignal = signal<{link: string; name: string} | null>(null);
	public readonly shareLink = this.shareLinkSignal.asReadonly();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly contextMenu: PlannerContextMenuService,
		private readonly planIcons: PlanIconResolver,
		private readonly planNames: PlanNameResolver,
		private readonly sharesApi: SharesApiService,
		private readonly authService: AuthService,
		private readonly versionManager: VersionManager,
		private readonly notifications: NotificationService,
	)
	{
		this.activePlanId = planManager.activePlanId;
		this.activeFolderId = planManager.activeFolderId;
	}

	// ── Sharing ─────────────────────────────────────────────────────────────

	public canShare(): boolean
	{
		return this.authService.isAuthenticated() && this.versionManager.activeVersion() !== null;
	}

	public sharePlan(plan: Plan): void
	{
		this.createShare('plan', plan.id, this.planNames.displayName(plan));
	}

	public shareFolder(id: string, name: string): void
	{
		this.createShare('folder', id, name);
	}

	private createShare(type: ShareType, id: string, name: string): void
	{
		const version = this.versionManager.activeVersion();
		if (!version) {
			return;
		}
		this.sharesApi.createShare({version: version.id, type, id}).subscribe({
			next: response => {
				this.shareLinkSignal.set({link: `${window.location.origin}/shared/${response.share}`, name});
			},
			error: () => this.notifications.show('Could not create the share link.'),
		});
	}

	public closeShareDialog(): void
	{
		this.shareLinkSignal.set(null);
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
		this.collapsedSignal.update(set => {
			const next = new Set(set);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	public toggleRoot(): void
	{
		this.toggleCollapse(ROOT_ID);
	}

	public toggleLocal(): void
	{
		this.toggleCollapse(LOCAL_ID);
	}

	public selectPlan(plan: Plan): void
	{
		this.planManager.setActivePlan(plan.id);
	}

	public selectFolder(id: string): void
	{
		this.planManager.setActiveFolder(id);
	}

	public startCreateFolder(parentId: string | null): void
	{
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
		if (parentId !== null) {
			this.collapsedSignal.update(set => {
				const next = new Set(set);
				next.delete(parentId);
				return next;
			});
		}
		const plan = this.planManager.createPlan('', parentId);
		this.planManager.setActivePlan(plan.id);
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
				case 'new-folder':
					this.planManager.createFolder(value, state.parentId);
					break;
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
			? `Delete subplan "${name}"? Its node is removed from the parent plan too.`
			: `Delete plan "${name}"?`;
		if (!confirm(message)) return;
		this.planManager.deletePlan(plan.id);
	}

	public buildTree(): PlanTree
	{
		return this.planManager.planTree();
	}

	// Drag-and-drop

	public onDragStart(event: DragEvent, type: 'plan' | 'folder', id: string, source: 'account' | 'local' = 'account'): void
	{
		this.dragItem = {type, id, source};
		event.dataTransfer!.effectAllowed = 'move';
	}

	public onDragOver(event: DragEvent, targetId: string): void
	{
		if (!this.dragItem) return;
		// Prevent dropping a folder into itself or its descendant (handled in drop)
		event.preventDefault();
		event.dataTransfer!.dropEffect = 'move';
		this.dragOverIdSignal.set(targetId);
	}

	public onDragLeave(event: DragEvent, targetId: string): void
	{
		if (this.dragOverId() === targetId) {
			this.dragOverIdSignal.set(null);
		}
	}

	public onDrop(event: DragEvent, targetFolderId: string | null): void
	{
		event.preventDefault();
		this.dragOverIdSignal.set(null);
		const item = this.dragItem;
		this.dragItem = null;
		if (!item) return;

		// A local plan/folder dropped onto the account migrates it up (placed at
		// the root; the target folder is ignored for a cross-section move).
		if (item.source === 'local') {
			this.planManager.moveLocalToAccount(item.id, item.type);
			return;
		}

		if (item.type === 'plan') {
			this.planManager.movePlan(item.id, targetFolderId);
		} else {
			if (item.id !== targetFolderId) {
				this.planManager.moveFolder(item.id, targetFolderId);
			}
		}
	}

	public onDragEnd(): void
	{
		this.dragItem = null;
		this.dragOverIdSignal.set(null);
	}

}
