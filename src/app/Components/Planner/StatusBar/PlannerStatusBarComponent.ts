import {Component, computed, ChangeDetectionStrategy, Signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {BuildCostBreakdown} from '@src/Model/Planner/Breakdown/BuildCostBreakdown';
import {PlanBreakdownService} from '@src/Model/Planner/Breakdown/PlanBreakdownService';
import {PowerBreakdown} from '@src/Model/Planner/Breakdown/PowerBreakdown';
import {GraphWarningEntry} from '@src/Model/Planner/Graph/GraphWarningEntry';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {ResourcePoolService} from '@src/Model/Planner/Pool/ResourcePoolService';
import {RateFormatter} from '@src/Model/RateFormatter';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'planner-status-bar',
	templateUrl: './PlannerStatusBarComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, BsDropdownModule, GameIconComponent],
	styles: [`
		:host {
			display: flex;
			align-items: center;
			gap: 16px;
			width: 100%;
			height: 100%;
			padding: 0 16px;
			background: #10141d;
			border-top: 1px solid #222b3e;
			font-size: 1rem;
			color: #8899bb;
			user-select: none;
			container-type: inline-size;
		}
		.stat { white-space: nowrap; }
		.stat b { color: #dfe5ec; font-weight: 600; }
		/* Variable-draw band beside the figure; the tooltip keeps it when the bar gets tight. */
		.stat .range { margin-left: 4px; font-size: 0.8em; color: #6f7f99; }
		@container (max-width: 760px) {
			.stat .range { display: none; }
		}
		.stat b.production { color: #7bc98a; }
		.stat b.deficit { color: #e0b56a; }
		.right {
			margin-left: auto;
			display: inline-flex;
			align-items: center;
			gap: 14px;
		}
		.state .dot {
			display: inline-block;
			width: 7px;
			height: 7px;
			border-radius: 50%;
			margin-right: 5px;
			vertical-align: middle;
		}
		.state-solved { color: #7bc98a; }
		.state-solved .dot { background: #4f9d69; }
		.state-modified { color: #e0b56a; }
		.state-modified .dot { background: #c9962e; }
		.state-busy { color: #d0a45e; }
		.state-busy .dot { background: #d0a45e; }
		.state-error { color: #e58a72; }
		.state-error .dot { background: #d4663f; }
		.state-idle .dot { background: #3a4654; }
		.warnings-toggle {
			background: none;
			border: none;
			padding: 0;
			font-size: 1rem;
			color: #e0b56a;
			cursor: pointer;
		}
		.warnings-toggle:hover { color: #f0cd8b; }
	`],
})
export class PlannerStatusBarComponent
{

	public readonly faTriangleExclamation = faTriangleExclamation;

	/**
	 * Plan-wide totals from the same breakdown the Power and Build cost panels
	 * show, so generators (fractional counts built as whole machines) and
	 * subplans are included here exactly as there.
	 */
	private readonly power: Signal<PowerBreakdown> = computed(() =>
		this.breakdownService.power(this.planManager.activePlan()));

	private readonly buildCost: Signal<BuildCostBreakdown> = computed(() =>
		this.breakdownService.buildCost(this.planManager.activePlan()));

	public readonly buildings = computed(() => this.buildCost().machines);

	/** MW drawn by all machines; "-" until the plan touches power at all. */
	public readonly powerText = computed(() => {
		const consumption = this.power().consumption.average;
		if (this.rateFormatter.isZero(consumption) && !this.hasProduction()) {
			return '-';
		}
		return this.rateFormatter.power(consumption);
	});

	/** The consumption's min–max band when variable-draw machines are in the plan; empty otherwise. */
	public readonly powerRangeText = computed(() => this.rangeText(this.power().consumption));

	public readonly netRangeText = computed(() => this.rangeText(this.power().net));

	/** MW produced by generators - only shown once the plan has any. */
	public readonly hasProduction = computed(() => !this.rateFormatter.isZero(this.power().production));

	public readonly productionText = computed(() => this.rateFormatter.power(this.power().production));

	/** Production minus consumption; surplus reads as an explicit gain ("+150 MW"). */
	public readonly net = computed(() => this.power().net.average);

	public readonly netIsSurplus = computed(() => this.net() > 0 && !this.rateFormatter.isZero(this.net()));

	public readonly netText = computed(() => {
		const net = this.net();
		if (this.rateFormatter.isZero(net)) {
			return this.rateFormatter.power(0);
		}
		return net > 0 ? `+${this.rateFormatter.power(net)}` : `-${this.rateFormatter.power(-net)}`;
	});

	/** Somersloops slotted across all machine groups of the plan. */
	public readonly sloops = computed(() => this.buildCost().sloops);

	/** Power shards needed to run every overclocked machine group. */
	public readonly shards = computed(() => this.buildCost().shards);

	public readonly sloopIcon = computed(() =>
		this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.SomersloopItem) ?? null);

	public readonly shardIcon = computed(() =>
		this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.PowerShardItem) ?? null);

	public readonly hasGraph = computed(() => this.graphNodes().length > 0);

	public readonly warningEntries: Signal<GraphWarningEntry[]>;

	/** Pooled resources the plan mines beyond what the other plans of its folder left. */
	public readonly poolWarnings = computed(() => {
		const plan = this.planManager.activePlan();
		if (!plan || this.planManager.activePlanShared()) {
			return [];
		}
		return this.pool.overUsed(plan).map(status =>
			`${status.item.name}: this plan mines ${this.rateFormatter.rate(status.usedByPlan, status.item)}, `
			+ `but only ${this.rateFormatter.rate(status.available ?? 0, status.item)} of the shared pool is left for it.`);
	});

	public readonly warningCount = computed(() =>
		this.warningEntries().reduce((sum, entry) => sum + entry.lines.length, 0) + this.poolWarnings().length);

	/** Settings were pushed by the folder (or the pool moved) after the graph was solved. */
	public readonly recalculationNeeded = computed(() =>
		this.planManager.activePlan()?.metadata?.recalculationNeeded ?? false);

	public readonly graphDirty: Signal<boolean>;

	private readonly graphNodes = computed(() => this.planManager.activePlan()?.graph?.nodes ?? []);

	public constructor(
		private readonly planManager: PlanManager,
		private readonly plannerGraph: PlannerGraphService,
		private readonly breakdownService: PlanBreakdownService,
		private readonly pool: ResourcePoolService,
		public readonly actions: PlannerActionsService,
		public readonly rateFormatter: RateFormatter,
		private readonly versionManager: VersionManager,
	)
	{
		this.graphDirty = planManager.activePlanGraphDirty;
		this.warningEntries = plannerGraph.warningEntries;
	}

	public focusWarning(entry: GraphWarningEntry): void
	{
		this.plannerGraph.focusNode(entry.nodeId);
	}


	/** "(250–750 MW)" for a variable figure, in the same orientation as its number; empty for a fixed one. */
	private rangeText(power: PowerDraw): string
	{
		if (!power.isVariable()) {
			return '';
		}
		const band = power.average < 0 ? power.negate() : power;
		return `(${this.rateFormatter.powerRange(band.min, band.max)})`;
	}

}
