import {Component, ChangeDetectionStrategy, EventEmitter, OnDestroy, Output, Signal, computed, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Subscription, firstValueFrom} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {OldPlanConverter} from '@src/Model/OldTools/OldPlanConverter';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';
import {OldToolsShareService} from '@src/Model/OldTools/OldToolsShareService';
import {SftFileParser} from '@src/Model/OldTools/SftFileParser';
import {GraphEdgeBuilder} from '@src/Model/Planner/Graph/GraphEdgeBuilder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {ProductionSolverService} from '@src/Model/Planner/ProductionSolverService';

/** A loaded production line offered for import; unchecked rows stay behind. */
interface ImportRow
{
	readonly plan: Plan;
	readonly iconHash: string | null;
	readonly unknownCount: number;
	/** The old tools' maximise semantics differ - flagged so the user knows the result may vary. */
	readonly hasMaximise: boolean;
	readonly selected: boolean;
}

/**
 * Modal importing production lines from the old Satisfactory Tools - pasted
 * share links (?share=KEY) and/or an exported .sft file. Loaded lines are
 * listed with icons and checkboxes; the host receives the checked plans.
 */
@Component({
	selector: 'import-old-plans-dialog',
	templateUrl: './ImportOldPlansDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, GameIconComponent, TooltipDirective],
	styles: `
		.import-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.import-dialog {
			width: min(560px, calc(100vw - 2rem));
		}
		.import-dialog input[type='file']::file-selector-button {
			background-color: #4e5d6c;
			color: #ebebeb;
			border: 0;
		}
		.import-rows {
			max-height: 40vh;
			overflow-y: auto;
		}
	`,
})
export class ImportOldPlansDialogComponent implements OnDestroy
{

	@Output() public readonly apply = new EventEmitter<Plan[]>();
	@Output() public readonly close = new EventEmitter<void>();

	public readonly faTriangleExclamation = faTriangleExclamation;

	public linksText = '';

	private readonly rowsSignal = signal<ImportRow[]>([]);
	public readonly rows: Signal<ImportRow[]> = this.rowsSignal.asReadonly();

	private readonly errorsSignal = signal<string[]>([]);
	public readonly errors: Signal<string[]> = this.errorsSignal.asReadonly();

	private readonly pendingSignal = signal(0);
	public readonly loading: Signal<boolean> = computed(() => this.pendingSignal() > 0);

	/** Solve progress while the import runs; null outside an import. */
	private readonly importProgressSignal = signal<{done: number; total: number} | null>(null);
	public readonly importProgress = this.importProgressSignal.asReadonly();
	public readonly importing: Signal<boolean> = computed(() => this.importProgressSignal() !== null);

	public readonly selectedCount: Signal<number> = computed(() => this.rowsSignal().filter(row => row.selected).length);

	/** Shows the maximise footnote as soon as one loaded line uses it. */
	public readonly hasMaximiseRows: Signal<boolean> = computed(() => this.rowsSignal().some(row => row.hasMaximise));

	private readonly loadedShareKeys = new Set<string>();
	private readonly subscriptions: Subscription[] = [];

	public constructor(
		private readonly shareService: OldToolsShareService,
		private readonly sftFileParser: SftFileParser,
		private readonly converter: OldPlanConverter,
		private readonly versionManager: VersionManager,
		private readonly planIcons: PlanIconResolver,
		private readonly productionSolver: ProductionSolverService,
		private readonly edgeBuilder: GraphEdgeBuilder,
		private readonly plannerGraph: PlannerGraphService,
	)
	{
	}

	public loadLinks(): void
	{
		const lines = this.linksText.split('\n').map(line => line.trim()).filter(line => line !== '');
		this.linksText = '';

		for (const line of lines) {
			const key = this.shareService.extractShareKey(line);
			if (key === null) {
				this.addError(`Not a share link: "${line}"`);
				continue;
			}
			if (this.loadedShareKeys.has(key)) {
				continue;
			}
			this.loadedShareKeys.add(key);

			this.pendingSignal.update(count => count + 1);
			this.subscriptions.push(this.shareService.fetchShare(key).subscribe({
				next: data => {
					this.pendingSignal.update(count => count - 1);
					this.addProductionLine(data);
				},
				error: () => {
					this.pendingSignal.update(count => count - 1);
					this.loadedShareKeys.delete(key);
					this.addError(`Could not load the share "${key}".`);
				},
			}));
		}
	}

	public onFilePicked(event: Event): void
	{
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) {
			return;
		}

		this.pendingSignal.update(count => count + 1);
		file.text()
			.then(content => this.sftFileParser.parse(content))
			.then(tabs => {
				if (tabs.length === 0) {
					this.addError(`"${file.name}" contains no production lines.`);
				}
				tabs.forEach(tab => this.addProductionLine(tab));
			})
			.catch((error: Error) => this.addError(`${file.name}: ${error.message}`))
			.finally(() => this.pendingSignal.update(count => count - 1));
	}

	public toggleRow(planId: string): void
	{
		this.rowsSignal.update(rows => rows.map(row => row.plan.id === planId ? {...row, selected: !row.selected} : row));
	}

	public canImport(): boolean
	{
		return !this.loading() && !this.importing() && this.selectedCount() > 0;
	}

	/** Backdrop clicks and Cancel are ignored while plans are being calculated. */
	public requestClose(): void
	{
		if (!this.importing()) {
			this.close.emit();
		}
	}

	/**
	 * Each selected plan gets one solver pass so it arrives with a calculated
	 * graph instead of an empty canvas. A failed solve (or an empty plan)
	 * imports without a graph - the user can calculate by hand later.
	 */
	public async importSelected(): Promise<void>
	{
		if (!this.canImport()) {
			return;
		}
		const selected = this.rowsSignal().filter(row => row.selected).map(row => row.plan);
		const plans: Plan[] = [];
		for (const plan of selected) {
			this.importProgressSignal.set({done: plans.length, total: selected.length});
			plans.push(await this.solve(plan));
		}
		this.importProgressSignal.set(null);
		this.apply.emit(plans);
	}

	public ngOnDestroy(): void
	{
		this.subscriptions.forEach(subscription => subscription.unsubscribe());
	}

	private async solve(plan: Plan): Promise<Plan>
	{
		try {
			const result = await firstValueFrom(this.productionSolver.solve(plan));
			if (result.status !== 'Optimal' || result.nodes.length === 0) {
				return plan;
			}
			const edges = this.edgeBuilder.build(result.nodes);
			await this.plannerGraph.layout(result.nodes, edges, plan.settings.graph);
			return {
				...plan,
				graph: {nodes: result.nodes, edges},
				metadata: {...plan.metadata, achievedMaximums: result.achievedMaximums},
			};
		} catch {
			return plan;
		}
	}

	private addProductionLine(data: OldProductionData): void
	{
		const versionData = this.versionManager.activeVersionData();
		if (!versionData) {
			this.addError('No game data is loaded for the active version.');
			return;
		}
		const conversion = this.converter.convert(data, versionData);
		this.rowsSignal.update(rows => [...rows, {
			plan: conversion.plan,
			iconHash: this.planIcons.iconHash(conversion.plan),
			unknownCount: conversion.unknownClassNames.length,
			hasMaximise: conversion.plan.requests.some(request => request.mode === 'maximise'),
			selected: true,
		}]);
	}

	private addError(message: string): void
	{
		this.errorsSignal.update(errors => [...errors, message]);
	}

}
