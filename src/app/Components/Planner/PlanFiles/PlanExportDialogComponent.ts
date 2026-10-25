import {Component, ChangeDetectionStrategy, HostListener, Input, OnInit, Signal, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {FormsModule} from '@angular/forms';
import {faFileExport, faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {PlanTreeIconComponent} from '@src/Components/Planner/Panels/Plans/PlanTreeIconComponent';
import {PlanExportFolderScope} from '@src/Components/Planner/PlanFiles/PlanExportFolderScope';
import {PlanExportRow} from '@src/Components/Planner/PlanFiles/PlanExportRow';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {FileDownloader} from '@src/Model/Export/FileDownloader';
import {NotificationService} from '@src/Model/NotificationService';
import {PlanFileDialogService} from '@src/Model/PlanFiles/PlanFileDialogService';
import {PlanExportRequest} from '@src/Model/PlanFiles/PlanExportRequest';
import {PlanExportSelection} from '@src/Model/PlanFiles/PlanExportSelection';
import {PlanExportTreeBuilder} from '@src/Model/PlanFiles/PlanExportTreeBuilder';
import {PlanFileWriter} from '@src/Model/PlanFiles/PlanFileWriter';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanTree} from '@src/Model/Planner/PlanTree';
import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';
import {TextMatcher} from '@src/Model/Search/TextMatcher';

@Component({
	selector: 'plan-export-dialog',
	templateUrl: './PlanExportDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, HotkeyBlockDirective, InfoNoteComponent, PlanTreeIconComponent],
	styles: `
		.plan-file-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.plan-file-dialog {
			width: min(560px, calc(100vw - 2rem));
			max-height: calc(100vh - 2rem);
			display: flex;
			flex-direction: column;
		}
		.plan-file-dialog > .card-body {
			overflow: auto;
			min-height: 0;
		}
		.export-rows {
			max-height: 50vh;
			overflow-y: auto;
		}
		.export-row {
			min-height: 1.75rem;
		}
		.export-row:hover {
			background-color: rgba(255, 255, 255, 0.05);
		}
		.export-row-subplan .export-row-label {
			font-size: 0.9rem;
			opacity: 0.8;
		}
		.export-row-match .export-row-label {
			font-weight: 600;
		}
	`,
})
export class PlanExportDialogComponent implements OnInit
{

	@Input({required: true}) public request!: PlanExportRequest;

	public readonly faFileExport = faFileExport;
	public readonly faMagnifyingGlass = faMagnifyingGlass;

	public readonly querySignal = signal('');
	public readonly nameSignal = signal('');

	private readonly selectedPlansSignal = signal<ReadonlySet<string>>(new Set());
	private readonly selectedFoldersSignal = signal<ReadonlySet<string>>(new Set());

	private readonly savingSignal = signal(false);
	public readonly saving: Signal<boolean> = this.savingSignal.asReadonly();

	private readonly errorSignal = signal<string | null>(null);
	public readonly error: Signal<string | null> = this.errorSignal.asReadonly();

	public readonly tree: Signal<PlanTree> = computed(() =>
		this.request.source === 'local' ? this.planManager.localPlanTree() : this.planManager.planTree());

	public readonly rows: Signal<PlanExportRow[]> = computed(() => {
		const rows: PlanExportRow[] = [];
		this.tree().entries.forEach(entry => this.collectRows(entry, 0, null, rows));
		return rows;
	});

	public readonly matchingIds: Signal<ReadonlySet<string> | null> = computed(() => {
		const query = this.querySignal();
		return this.matcher.normalize(query) === '' ? null : new Set(this.matcher.filter(this.rows(), query, row => row.name).map(row => row.id));
	});

	/** Hits plus the folders and plans above them, so each hit is seen in its place. */
	public readonly visibleRows: Signal<PlanExportRow[]> = computed(() => {
		const matching = this.matchingIds();
		if (matching === null) {
			return this.rows();
		}
		const byId = new Map(this.rows().map(row => [row.id, row]));
		const visible = new Set<string>();
		matching.forEach(id => {
			let row = byId.get(id);
			while (row !== undefined && !visible.has(row.id)) {
				visible.add(row.id);
				row = row.parentId === null ? undefined : byId.get(row.parentId);
			}
		});
		return this.rows().filter(row => visible.has(row.id));
	});

	public readonly suggestedName: Signal<string> = computed(() => {
		const names = this.treeBuilder.rootEntries(this.tree().entries, this.selection())
			.map(entry => 'folder' in entry ? entry.folder.name : this.planNames.displayName(entry.plan));
		if (names.length === 0) {
			return 'Satisfactory Tools plans';
		}
		if (names.length <= 2) {
			return names.join(' and ');
		}
		return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
	});

	/** Subplan → parent plan, to tell which subplans their parent already takes along. */
	private readonly parentPlans: Signal<Map<string, string | null>> = computed(() => {
		const parents = new Map<string, string | null>();
		const visit = (entry: PlanTreePlan, parentId: string | null): void => {
			parents.set(entry.plan.id, parentId);
			entry.subplans.forEach(subplan => visit(subplan, entry.plan.id));
		};
		const visitFolder = (entry: PlanTreeFolder): void => {
			entry.children.forEach(visitFolder);
			entry.plans.forEach(plan => visit(plan, null));
		};
		this.tree().rootFolders.forEach(visitFolder);
		this.tree().rootPlans.forEach(plan => visit(plan, null));
		return parents;
	});

	private readonly folderScopes: Signal<Map<string, PlanExportFolderScope>> = computed(() => {
		const scopes = new Map<string, PlanExportFolderScope>();
		this.tree().rootFolders.forEach(folder => this.collectScope(folder, scopes));
		return scopes;
	});

	public readonly selectedCount: Signal<number> = computed(() =>
		[...this.parentPlans().keys()].filter(id => this.isPlanSelected(id)).length);

	public readonly canSave: Signal<boolean> = computed(() => !this.saving() && this.selectedCount() > 0);

	public constructor(
		private readonly dialogs: PlanFileDialogService,
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly treeBuilder: PlanExportTreeBuilder,
		private readonly writer: PlanFileWriter,
		private readonly downloader: FileDownloader,
		private readonly notifications: NotificationService,
		private readonly planIcons: PlanIconResolver,
		private readonly matcher: TextMatcher,
		private readonly planNames: PlanNameResolver,
	)
	{
	}

	public ngOnInit(): void
	{
		const target = this.request.target;
		if (target === null) {
			this.selectAll();
		} else if (target.type === 'plan') {
			this.selectedPlansSignal.set(new Set([target.id]));
		} else {
			this.toggleFolder(target.id);
		}
	}

	/** With a search, only the hits are touched: "All" after searching "steel" means all steel plans. */
	public selectAll(): void
	{
		const matching = this.matchingIds();
		if (matching === null) {
			this.selectedPlansSignal.set(new Set(this.tree().entries.flatMap(entry => 'folder' in entry
				? this.folderScopes().get(entry.folder.id)?.topPlanIds ?? []
				: [entry.plan.id])));
			this.selectedFoldersSignal.set(new Set(this.tree().rootFolders.flatMap(folder => this.folderScopes().get(folder.folder.id)?.emptyFolderIds ?? [])));
			return;
		}
		this.rows().filter(row => matching.has(row.id)).forEach(row => {
			if (row.kind === 'folder' ? this.folderState(row.id) !== 'checked' : !this.isPlanSelected(row.id)) {
				row.kind === 'folder' ? this.toggleFolder(row.id) : this.togglePlan(row.id);
			}
		});
	}

	public selectNone(): void
	{
		const matching = this.matchingIds();
		if (matching === null) {
			this.selectedPlansSignal.set(new Set());
			this.selectedFoldersSignal.set(new Set());
			return;
		}
		this.rows().filter(row => matching.has(row.id)).forEach(row => {
			if (row.kind === 'folder') {
				if (this.folderState(row.id) !== 'unchecked') {
					this.setFolder(row.id, false);
				}
			} else if (this.selectedPlansSignal().has(row.id)) {
				this.togglePlan(row.id);
			}
		});
	}

	public isMatch(id: string): boolean
	{
		return this.matchingIds()?.has(id) ?? false;
	}

	public planIconHash(row: PlanExportRow): string | null
	{
		return row.plan === null ? null : this.planIcons.iconHash(row.plan);
	}

	public isPlanSelected(id: string): boolean
	{
		const selected = this.selectedPlansSignal();
		let current: string | null = id;
		while (current !== null) {
			if (selected.has(current)) {
				return true;
			}
			current = this.parentPlans().get(current) ?? null;
		}
		return false;
	}

	/** Its parent plan is selected, and a plan always takes its subplans along. */
	public isPlanCovered(id: string): boolean
	{
		const parentId = this.parentPlans().get(id) ?? null;
		return parentId !== null && this.isPlanSelected(parentId);
	}

	public folderState(id: string): 'checked' | 'mixed' | 'unchecked'
	{
		const scope = this.folderScopes().get(id);
		if (!scope) {
			return 'unchecked';
		}
		const folders = this.selectedFoldersSignal();
		const all = scope.topPlanIds.every(planId => this.isPlanSelected(planId))
			&& scope.emptyFolderIds.every(folderId => folders.has(folderId));
		if (all && scope.topPlanIds.length + scope.emptyFolderIds.length > 0) {
			return 'checked';
		}
		const some = scope.allPlanIds.some(planId => this.isPlanSelected(planId))
			|| scope.emptyFolderIds.some(folderId => folders.has(folderId));
		return some ? 'mixed' : 'unchecked';
	}

	public toggleFolder(id: string): void
	{
		this.setFolder(id, this.folderState(id) !== 'checked');
	}

	private setFolder(id: string, selected: boolean): void
	{
		const scope = this.folderScopes().get(id);
		if (!scope) {
			return;
		}
		this.selectedPlansSignal.update(current => {
			const next = new Set(current);
			if (selected) {
				scope.topPlanIds.forEach(planId => next.add(planId));
			} else {
				scope.allPlanIds.forEach(planId => next.delete(planId));
			}
			return next;
		});
		this.selectedFoldersSignal.update(current => {
			const next = new Set(current);
			scope.emptyFolderIds.forEach(folderId => selected ? next.add(folderId) : next.delete(folderId));
			return next;
		});
	}

	public togglePlan(id: string): void
	{
		if (this.isPlanCovered(id)) {
			return;
		}
		const selected = this.selectedPlansSignal().has(id);
		this.selectedPlansSignal.update(current => {
			const next = new Set(current);
			if (selected) {
				// Unticking a plan unticks its subplans too, rather than leaving them behind as separate plans.
				[...this.parentPlans().keys()]
					.filter(planId => planId === id || this.descendsFrom(planId, id))
					.forEach(planId => next.delete(planId));
			} else {
				next.add(id);
			}
			return next;
		});
	}

	public async save(): Promise<void>
	{
		const version = this.versionManager.activeVersion();
		if (!this.canSave() || version === null) {
			return;
		}
		this.savingSignal.set(true);
		this.errorSignal.set(null);
		try {
			const roots = this.treeBuilder.build(this.tree().entries, this.selection());
			const content = await this.writer.write(roots, version);
			const fileName = this.downloader.safeName(this.nameSignal().trim() || this.suggestedName(), 'sft', 'Satisfactory Tools plans');
			const savedPath = await this.downloader.download(new Blob([content], {type: 'application/octet-stream'}), fileName, true);
			this.notifications.showSuccess(savedPath === null ? `Downloaded ${fileName}.` : `Saved to ${savedPath}.`);
			this.dialogs.closeExport();
		} catch (error) {
			this.errorSignal.set(`Could not export the plans: ${(error as Error).message}`);
		} finally {
			this.savingSignal.set(false);
		}
	}

	@HostListener('document:keydown.escape')
	public close(): void
	{
		if (!this.saving()) {
			this.dialogs.closeExport();
		}
	}

	private descendsFrom(planId: string, ancestorId: string): boolean
	{
		let current = this.parentPlans().get(planId) ?? null;
		while (current !== null) {
			if (current === ancestorId) {
				return true;
			}
			current = this.parentPlans().get(current) ?? null;
		}
		return false;
	}

	private selection(): PlanExportSelection
	{
		return {planIds: this.selectedPlansSignal(), folderIds: this.selectedFoldersSignal()};
	}

	private collectRows(entry: PlanTreeFolder | PlanTreePlan, depth: number, parentId: string | null, rows: PlanExportRow[]): void
	{
		if ('folder' in entry) {
			rows.push({kind: 'folder', id: entry.folder.id, name: entry.folder.name, depth, plan: null, parentId});
			entry.entries.forEach(child => this.collectRows(child, depth + 1, entry.folder.id, rows));
			return;
		}
		rows.push({kind: 'plan', id: entry.plan.id, name: this.planNames.displayName(entry.plan), depth, plan: entry.plan, parentId});
		entry.subplans.forEach(subplan => this.collectRows(subplan, depth + 1, entry.plan.id, rows));
	}

	private collectScope(entry: PlanTreeFolder, scopes: Map<string, PlanExportFolderScope>): PlanExportFolderScope
	{
		const children = entry.children.map(child => this.collectScope(child, scopes));
		const allOf = (plan: PlanTreePlan): string[] => [plan.plan.id, ...plan.subplans.flatMap(allOf)];
		const isEmpty = entry.children.length === 0 && entry.plans.length === 0;
		const scope: PlanExportFolderScope = {
			topPlanIds: [...entry.plans.map(plan => plan.plan.id), ...children.flatMap(child => child.topPlanIds)],
			allPlanIds: [...entry.plans.flatMap(allOf), ...children.flatMap(child => child.allPlanIds)],
			emptyFolderIds: [...(isEmpty ? [entry.folder.id] : []), ...children.flatMap(child => child.emptyFolderIds)],
		};
		scopes.set(entry.folder.id, scope);
		return scope;
	}

}
