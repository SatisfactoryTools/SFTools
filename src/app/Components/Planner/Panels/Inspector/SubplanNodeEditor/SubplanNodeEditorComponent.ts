import {Component, ChangeDetectionStrategy, Input, OnChanges, OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowUpRightFromSquare, faBoxOpen, faDiagramProject} from '@fortawesome/free-solid-svg-icons';
import {Subject, Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {GoToNodeButtonComponent} from '@src/Components/Planner/Panels/GoToNode/GoToNodeButtonComponent';
import {InspectorMenuButtonComponent} from '@src/Components/Planner/Panels/Inspector/InspectorMenuButtonComponent';
import {SubplanIORateDraft} from '@src/Components/Planner/Panels/Inspector/SubplanNodeEditor/SubplanIORateDraft';
import {SubplanIOSection} from '@src/Components/Planner/Panels/Inspector/SubplanNodeEditor/SubplanIOSection';
import {SubplanSizingOption} from '@src/Components/Planner/Panels/Inspector/SubplanNodeEditor/SubplanSizingOption';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlanBreakdownService} from '@src/Model/Planner/Breakdown/PlanBreakdownService';
import {SubplanTotals} from '@src/Model/Planner/Breakdown/SubplanTotals';
import {GraphIOParts} from '@src/Model/Planner/GraphIOParts';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';
import {SubplanSizing} from '@src/Model/Planner/SubplanSizing';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';
import {RateFormatter} from '@src/Model/RateFormatter';

const APPLY_DEBOUNCE_MS = 400;

@Component({
	selector: 'subplan-node-editor',
	templateUrl: './SubplanNodeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [InspectorMenuButtonComponent, FormsModule, FaIconComponent, AppTooltipDirective, GameIconComponent, GoToNodeButtonComponent],
	styles: [`
		.info-row {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			column-gap: 0.5rem;
			row-gap: 0.25rem;
			min-width: 0;
		}
		.info-row > select {
			flex: 1 1 10rem;
			width: auto;
		}
		.io-list {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
		}
		.io-row {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) 8.5rem;
			align-items: center;
			column-gap: 0.5rem;
		}
		.io-row.with-total {
			grid-template-columns: auto minmax(0, 1fr) 8.5rem 5.5rem;
		}
		.io-head {
			font-size: 0.75rem;
		}
		.io-total, .io-fixed-rate {
			text-align: right;
			font-variant-numeric: tabular-nums;
		}
		@container panel (max-width: 380px) {
			.io-row, .io-row.with-total {
				grid-template-columns: auto minmax(0, 1fr) 7.5rem;
			}
			.io-row .io-total {
				display: none;
			}
		}
		.build-count {
			width: 6.5rem;
		}
		.totals {
			display: flex;
			flex-wrap: wrap;
			column-gap: 0.75rem;
			row-gap: 0.15rem;
		}
	`],
})
export class SubplanNodeEditorComponent implements OnChanges, OnDestroy
{

	public readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
	public readonly faBoxOpen = faBoxOpen;
	public readonly faDiagramProject = faDiagramProject;

	public readonly sizingOptions: SubplanSizingOption[] = [
		{
			sizing: 'follows',
			label: 'Follows this plan',
			description: 'The calculation of this plan decides how much of the subplan it needs and resizes the subplan to match. It may also make the same items itself when that is cheaper.',
		},
		{
			sizing: 'copies',
			label: 'Whole copies',
			description: 'The subplan stays as it is. The calculation of this plan decides how many copies of it to build.',
		},
		{
			sizing: 'fixed',
			label: 'Fixed',
			description: 'Built exactly as it is, as many times as set here. This plan works around it.',
		},
	];

	@Input({required: true}) public node!: SubplanNode;

	@Input() public readOnly = false;

	public sections: SubplanIOSection[] = [];

	public totals: SubplanTotals | null = null;

	public buildCount = 1;

	public sizing: SubplanSizing = 'follows';

	/** A pending resize must apply to the node the user typed into, even after the selection moved on. */
	private loadedNode: SubplanNode | null = null;

	private parts: GraphIOParts = {inputs: [], products: [], byproducts: []};

	private pendingFactor: number | null = null;

	private pendingBuildCount: number | null = null;

	private readonly applySubject = new Subject<void>();
	private readonly applySubscription: Subscription;

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly planManager: PlanManager,
		private readonly planNames: PlanNameResolver,
		private readonly planIcons: PlanIconResolver,
		private readonly subplanResolver: SubplanIOResolver,
		private readonly breakdown: PlanBreakdownService,
		public readonly rateFormatter: RateFormatter,
	)
	{
		this.applySubscription = this.applySubject
			.pipe(debounceTime(APPLY_DEBOUNCE_MS))
			.subscribe(() => this.applyDraft());
	}

	public ngOnChanges(): void
	{
		if (this.loadedNode?.id === this.node.id) {
			this.loadedNode = this.node;
			this.sizing = this.node.sizing;
			// A resize coming back: show the rates it landed on unless the user kept typing.
			if (this.pendingFactor === null) {
				this.reload();
			}
			if (this.pendingBuildCount === null) {
				this.buildCount = this.node.buildCount;
			}
			return;
		}
		this.flushPendingApply();
		this.loadedNode = this.node;
		this.buildCount = this.node.buildCount;
		this.sizing = this.node.sizing;
		this.reload();
	}

	public ngOnDestroy(): void
	{
		this.flushPendingApply();
		this.applySubscription.unsubscribe();
	}

	/** The subplan may have been renamed since the node was saved. */
	public get displayName(): string
	{
		const plan = this.subplan;
		return plan ? this.planNames.displayName(plan) : this.node.name;
	}

	public get iconHash(): string | null
	{
		const plan = this.subplan;
		return plan ? this.planIcons.iconHash(plan) : null;
	}

	public get subplanExists(): boolean
	{
		return this.subplan !== null;
	}

	public get sizingDescription(): string
	{
		return this.sizingOptions.find(option => option.sizing === this.sizing)?.description ?? '';
	}

	public get builds(): number
	{
		return this.node.builds();
	}

	/** Rates are per copy; the total column shows what this node makes in all. */
	public get showTotals(): boolean
	{
		return this.builds !== 1;
	}

	public get ratesEditable(): boolean
	{
		return !this.readOnly;
	}

	public get isEmpty(): boolean
	{
		return this.sections.every(section => section.rows.length === 0);
	}

	public totalText(draft: SubplanIORateDraft): string
	{
		return this.rateFormatter.rate(draft.rate * this.builds, draft.item);
	}

	public rateText(draft: SubplanIORateDraft): string
	{
		return this.rateFormatter.rate(draft.rate, draft.item);
	}

	public totalsText(totals: SubplanTotals): string[]
	{
		const builds = this.builds;
		const parts = [`${this.rateFormatter.machineCount(totals.machines * builds)} machines`];
		const net = (totals.consumption - totals.production) * builds;
		parts.push(net >= 0 ? `${this.rateFormatter.power(net)} used` : `${this.rateFormatter.power(-net)} made`);
		if (totals.sloops > 0) {
			parts.push(`${this.rateFormatter.machineCount(totals.sloops * builds)} sloops`);
		}
		return parts;
	}

	public openSubplan(): void
	{
		this.actions.requestSubplanOpen(this.node.subplanId);
	}

	public unpack(): void
	{
		this.actions.requestSubplanUnpack(this.node.id);
	}

	public onSizingChange(): void
	{
		this.flushPendingApply();
		this.actions.requestSubplanSizing({nodeId: this.node.id, sizing: this.sizing});
	}

	public onBuildCountChange(): void
	{
		// Mid-typing values (empty, zero, negative) must not reach the node.
		if (typeof this.buildCount !== 'number' || !isFinite(this.buildCount) || this.buildCount < 1) {
			return;
		}
		this.pendingBuildCount = this.subplanResolver.normalizeBuildCount(this.buildCount);
		this.applySubject.next();
	}

	public onRateChange(section: SubplanIOSection, index: number): void
	{
		const draft = section.rows[index];
		const current = this.parts[section.key].find(io => io.item.className === draft?.item.className)?.maxAmount;
		// Mid-typing values (empty, zero, negative) must not resize anything.
		if (!current || current <= 0 || typeof draft.rate !== 'number' || !isFinite(draft.rate) || draft.rate <= 0) {
			return;
		}
		this.pendingFactor = draft.rate / current;
		this.refreshRates(draft);
		this.applySubject.next();
	}

	private get subplan(): Plan | null
	{
		return this.planManager.findPlan(this.node.subplanId);
	}

	private reload(): void
	{
		this.parts = this.subplanResolver.parts(this.node.subplanId);
		this.totals = this.subplanExists ? this.breakdown.subplanTotals(this.node.subplanId) : null;
		this.refreshRates(null);
	}

	private refreshRates(typed: SubplanIORateDraft | null): void
	{
		const factor = this.pendingFactor ?? 1;
		const rows = (key: SubplanIOSection['key']): SubplanIORateDraft[] => this.parts[key].map(io => {
			const existing = this.sections.find(section => section.key === key)?.rows.find(row => row.item.className === io.item.className);
			return existing !== undefined && existing === typed
				? existing
				: {item: io.item, rate: this.roundRate(io.maxAmount * factor)};
		});
		this.sections = [
			{key: 'products', label: 'Makes', rows: rows('products')},
			{key: 'byproducts', label: 'Also makes', rows: rows('byproducts')},
			{key: 'inputs', label: 'Needs', rows: rows('inputs')},
		];
	}

	private flushPendingApply(): void
	{
		if (this.pendingFactor !== null || this.pendingBuildCount !== null) {
			this.applyDraft();
		}
	}

	private applyDraft(): void
	{
		const factor = this.pendingFactor;
		const buildCount = this.pendingBuildCount;
		const node = this.loadedNode;
		this.pendingFactor = null;
		this.pendingBuildCount = null;
		if (node === null) {
			return;
		}
		if (buildCount !== null && buildCount !== node.buildCount) {
			this.actions.requestSubplanBuildCount({nodeId: node.id, buildCount});
		}
		if (factor === null || !isFinite(factor) || factor <= 0 || Math.abs(factor - 1) <= 1e-9) {
			return;
		}
		this.actions.requestSubplanScale({nodeId: node.id, subplanId: node.subplanId, factor});
	}

	private roundRate(rate: number): number
	{
		return Math.round(rate * 10000) / 10000;
	}

}
