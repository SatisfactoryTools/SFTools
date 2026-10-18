import {Component, ChangeDetectionStrategy, HostListener, Input, Signal, computed, effect, signal, untracked} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCaretDown, faCaretRight, faCircleCheck, faCircleInfo, faFileImport, faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {PlanTreeIconComponent} from '@src/Components/Planner/Panels/Plans/PlanTreeIconComponent';
import {PlanImportRow} from '@src/Components/Planner/PlanFiles/PlanImportRow';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {ImportFolderName} from '@src/Model/PlanFiles/ImportFolderName';
import {PlanFileContent} from '@src/Model/PlanFiles/PlanFileContent';
import {PlanFileDialogService} from '@src/Model/PlanFiles/PlanFileDialogService';
import {PlanFileImporter} from '@src/Model/PlanFiles/PlanFileImporter';
import {PlanFileReader} from '@src/Model/PlanFiles/PlanFileReader';
import {PlanImportPreview} from '@src/Model/PlanFiles/PlanImportPreview';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';

@Component({
	selector: 'plan-import-dialog',
	templateUrl: './PlanImportDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, HotkeyBlockDirective, InfoNoteComponent, PlanTreeIconComponent],
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
			width: min(640px, calc(100vw - 2rem));
			max-height: calc(100vh - 2rem);
			display: flex;
			flex-direction: column;
		}
		.plan-file-dialog > .card-body {
			overflow: auto;
			min-height: 0;
		}
		.import-row {
			min-height: 1.75rem;
		}
		.import-row-toggle {
			cursor: pointer;
		}
		.import-row-toggle:hover {
			background-color: rgba(255, 255, 255, 0.05);
		}
		.import-row-subplan .import-row-label {
			font-size: 0.9rem;
			opacity: 0.8;
		}
		.import-issues {
			margin: 0.125rem 0 0.375rem;
			padding-left: 1.25rem;
		}
	`,
})
export class PlanImportDialogComponent
{

	@Input({required: true}) public file!: PlanFileContent;

	public readonly faFileImport = faFileImport;
	public readonly faCircleCheck = faCircleCheck;
	public readonly faCircleInfo = faCircleInfo;
	public readonly faTriangleExclamation = faTriangleExclamation;
	public readonly faCaretDown = faCaretDown;
	public readonly faCaretRight = faCaretRight;

	private readonly previewSignal = signal<PlanImportPreview | null>(null);
	public readonly preview: Signal<PlanImportPreview | null> = this.previewSignal.asReadonly();

	private readonly errorSignal = signal<string | null>(null);
	public readonly error: Signal<string | null> = this.errorSignal.asReadonly();

	private readonly importingSignal = signal(false);
	public readonly importing: Signal<boolean> = this.importingSignal.asReadonly();

	private readonly expandedSignal = signal<ReadonlySet<string>>(new Set());

	public readonly targetVersionName: Signal<string> = computed(() => this.versionManager.activeVersion()?.name ?? 'this version');

	public readonly rows: Signal<PlanImportRow[]> = computed(() => {
		const preview = this.preview();
		if (preview === null) {
			return [];
		}
		const rows: PlanImportRow[] = [];
		const folders = preview.conversion.folders;
		const plans = preview.conversion.plans;
		preview.roots.forEach(root => root.type === 'folder'
			? this.folderRows(folders.find(folder => folder.id === root.id)!, 0, folders, plans, preview, rows)
			: this.planRows(plans.find(plan => plan.id === root.id)!, 0, plans, preview, rows));
		return rows;
	});

	public readonly planCount: Signal<number> = computed(() => this.preview()?.conversion.plans.length ?? 0);
	public readonly plansWithWarnings: Signal<number> = computed(() => this.rows().filter(row => row.kind === 'plan' && row.hasWarnings).length);

	public readonly canImport: Signal<boolean> = computed(() =>
		this.preview() !== null && !this.importing() && this.planManager.loadedForActiveVersion());

	private started = false;

	public constructor(
		private readonly dialogs: PlanFileDialogService,
		private readonly reader: PlanFileReader,
		private readonly importer: PlanFileImporter,
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
		private readonly planIcons: PlanIconResolver,
		private readonly planNames: PlanNameResolver,
		private readonly notifications: NotificationService,
	)
	{
		// A file opened at start-up arrives before the game data and the plans are loaded.
		effect(() => {
			if (!this.started && this.versionManager.activeVersionData() !== null && this.planManager.loadedForActiveVersion()) {
				this.started = true;
				untracked(() => void this.prepare());
			}
		});
	}

	public isExpanded(id: string): boolean
	{
		return this.expandedSignal().has(id);
	}

	public toggleExpanded(id: string): void
	{
		this.expandedSignal.update(expanded => {
			const next = new Set(expanded);
			if (!next.delete(id)) {
				next.add(id);
			}
			return next;
		});
	}

	public import(): void
	{
		const preview = this.preview();
		if (preview === null || !this.canImport()) {
			return;
		}
		this.importingSignal.set(true);
		const folder = this.importer.apply(preview, ImportFolderName.forDate(new Date()));
		const count = preview.conversion.plans.length;
		this.notifications.showSuccess(`Imported ${count} ${count === 1 ? 'plan' : 'plans'} into "${folder.name}".`);
		this.dialogs.closeImport();
	}

	@HostListener('document:keydown.escape')
	public close(): void
	{
		if (!this.importing()) {
			this.dialogs.closeImport();
		}
	}

	private async prepare(): Promise<void>
	{
		try {
			const file = await this.reader.read(this.file.content);
			const preview = await this.importer.prepare(file);
			this.previewSignal.set(preview);
			// Few rows: show the details at once instead of making the user open each one.
			const rows = this.rows();
			if (rows.length <= 5) {
				this.expandedSignal.set(new Set(rows.filter(row => row.issues.length > 0).map(row => row.id)));
			}
		} catch (error) {
			this.errorSignal.set((error as Error).message);
		}
	}

	private folderRows(folder: Folder, depth: number, folders: readonly Folder[], plans: readonly Plan[], preview: PlanImportPreview, rows: PlanImportRow[]): void
	{
		rows.push(this.row('folder', folder.id, folder.name, depth, null, false, preview));
		const children = [
			...folders.filter(child => child.parentId === folder.id),
			...plans.filter(plan => plan.folderId === folder.id && plan.parentPlanId === null),
		].sort(PlanManager.bySiblingOrder);
		children.forEach(child => 'parentId' in child
			? this.folderRows(child, depth + 1, folders, plans, preview, rows)
			: this.planRows(child, depth + 1, plans, preview, rows));
	}

	private planRows(plan: Plan, depth: number, plans: readonly Plan[], preview: PlanImportPreview, rows: PlanImportRow[]): void
	{
		rows.push(this.row('plan', plan.id, this.planNames.displayName(plan), depth, this.planIcons.iconHash(plan), plan.parentPlanId !== null, preview));
		plans.filter(subplan => subplan.parentPlanId === plan.id)
			.sort(PlanManager.bySiblingOrder)
			.forEach(subplan => this.planRows(subplan, depth + 1, plans, preview, rows));
	}

	private row(kind: 'folder' | 'plan', id: string, name: string, depth: number, iconHash: string | null, subplan: boolean, preview: PlanImportPreview): PlanImportRow
	{
		const issues = preview.conversion.issues.get(id) ?? [];
		const warningCount = issues.filter(issue => issue.level === 'warning').length;
		return {kind, id, name, depth, iconHash, subplan, issues, hasWarnings: warningCount > 0, warningCount, infoCount: issues.length - warningCount};
	}

}
