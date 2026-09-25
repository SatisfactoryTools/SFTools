import {Component, computed, signal, ChangeDetectionStrategy, Signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBolt, faDiagramProject, faIndustry, faLayerGroup, faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {BuildCostBreakdown} from '@src/Model/Planner/Breakdown/BuildCostBreakdown';
import {PlanBreakdownService} from '@src/Model/Planner/Breakdown/PlanBreakdownService';
import {SubplanBuildCounter} from '@src/Model/Planner/SubplanBuildCounter';
import {PowerBreakdown} from '@src/Model/Planner/Breakdown/PowerBreakdown';
import {GraphWarningEntry} from '@src/Model/Planner/Graph/GraphWarningEntry';
import {GraphWarningKind} from '@src/Model/Planner/Graph/GraphWarningKind';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {PoolResourceStatus} from '@src/Model/Planner/Pool/PoolResourceStatus';
import {ResourcePoolService} from '@src/Model/Planner/Pool/ResourcePoolService';
import {RateFormatter} from '@src/Model/RateFormatter';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {WarningKindFilter} from '@src/Components/Planner/StatusBar/WarningKindFilter';

@Component({
	selector: 'planner-status-bar',
	templateUrl: './PlannerStatusBarComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, BsDropdownModule, GameIconComponent, AppTooltipDirective],
	styles: [`
		/* The bar never spills out of its box: it drops detail in steps as the
		   centre column narrows (ranges, then label words, then the state text),
		   and whatever is left is clipped rather than overflowing the canvas. */
		:host {
			display: flex;
			align-items: center;
			gap: 16px;
			width: 100%;
			height: 100%;
			min-width: 0;
			padding: 0 16px;
			overflow: hidden;
			background: #10141d;
			border-top: 1px solid #222b3e;
			font-size: 1rem;
			color: #8899bb;
			user-select: none;
			container-type: inline-size;
		}
		.stat { white-space: nowrap; flex-shrink: 0; }
		.stat b { color: #dfe5ec; font-weight: 600; }
		.stat-icon { display: none; opacity: 0.8; }
		.stat .abbr { display: none; }
		/* Variable-draw band beside the figure; the tooltip keeps it when the bar gets tight. */
		.stat .range { margin-left: 4px; font-size: 0.8em; color: #6f7f99; }
		.stat b.production { color: #7bc98a; }
		.stat b.deficit { color: #e0b56a; }
		.right {
			margin-left: auto;
			display: inline-flex;
			align-items: center;
			gap: 14px;
			min-width: 0;
			flex-shrink: 1;
		}
		.state {
			display: inline-flex;
			align-items: center;
			min-width: 0;
			white-space: nowrap;
		}
		.state-text { overflow: hidden; text-overflow: ellipsis; }
		.state .dot {
			display: inline-block;
			flex-shrink: 0;
			width: 7px;
			height: 7px;
			border-radius: 50%;
			margin-right: 5px;
			vertical-align: middle;
		}
		@container (max-width: 760px) {
			.stat .range { display: none; }
		}
		@container (max-width: 600px) {
			:host { gap: 12px; padding: 0 12px; }
			.stat .lbl { display: none; }
			.stat .abbr { display: inline; }
			.stat-icon { display: inline-block; margin-right: 4px; }
		}
		@container (max-width: 420px) {
			:host { gap: 10px; }
			.state-text { display: none; }
			.state .dot { margin-right: 0; }
			.stat.zero { display: none; }
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
			display: inline-flex;
			align-items: center;
			gap: 6px;
			background: rgba(224, 181, 106, 0.12);
			border: 1px solid rgba(224, 181, 106, 0.35);
			border-radius: 999px;
			padding: 1px 10px;
			font-size: 0.95rem;
			font-weight: 600;
			line-height: 1.4;
			color: #e0b56a;
			cursor: pointer;
		}
		.warnings-toggle:hover { background: rgba(224, 181, 106, 0.2); color: #f0cd8b; }

		/* The warnings dropup. It is rendered into the body (container="body"),
		   so everything here is addressed by class - no :host descendants. */
		.warnings-menu {
			width: min(440px, calc(100vw - 24px));
			padding: 0;
			overflow: hidden;
			background: #151b26;
			border: 1px solid #2b3648;
			border-radius: 8px;
			box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
		}
		.warnings-head {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 10px 12px;
			background: #1b2231;
			border-bottom: 1px solid #2b3648;
			color: #e0b56a;
		}
		.warnings-title { flex: 1; font-weight: 600; color: #dfe5ec; }
		.warnings-total {
			min-width: 24px;
			padding: 0 7px;
			border-radius: 999px;
			background: rgba(224, 181, 106, 0.18);
			text-align: center;
			font-weight: 600;
		}
		/* Kind chips: with many warnings the list is far easier to read one
		   kind at a time, and the counts alone already say what is wrong. */
		.warnings-kinds {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
			padding: 8px 12px;
			border-bottom: 1px solid #222b3a;
		}
		.kind-chip {
			display: inline-flex;
			align-items: center;
			gap: 5px;
			padding: 2px 9px;
			border: 1px solid #33405a;
			border-radius: 999px;
			background: transparent;
			font-size: 0.8rem;
			line-height: 1.5;
			color: #9fb0c8;
			cursor: pointer;
		}
		.kind-chip b { color: #dfe5ec; font-weight: 600; }
		.kind-chip:hover { background: #1f2836; color: #dfe5ec; }
		.kind-chip.active { background: #2a3547; border-color: #4a5c7c; color: #dfe5ec; }
		/* Scrolls instead of growing past the screen; the list keeps its
		   header and chips in view while it does. */
		.warnings-list {
			max-height: min(52vh, 420px);
			overflow-y: auto;
			overscroll-behavior: contain;
			padding: 6px;
		}
		.warning-group {
			display: block;
			width: 100%;
			margin-bottom: 4px;
			padding: 6px;
			border: 1px solid transparent;
			border-radius: 6px;
			background: #1a2130;
			text-align: left;
			color: inherit;
		}
		.warning-group:last-child { margin-bottom: 0; }
		.group-button { cursor: pointer; }
		.group-button:hover { background: #222c3d; border-color: #38465e; }
		.group-head {
			display: flex;
			align-items: center;
			gap: 7px;
			padding: 0 2px 5px;
		}
		.group-icon { color: #8fa4c2; }
		.group-name {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 0.95rem;
			font-weight: 600;
			color: #dfe5ec;
		}
		.group-count {
			flex-shrink: 0;
			min-width: 20px;
			padding: 0 6px;
			border-radius: 999px;
			background: #2a3547;
			font-size: 0.75rem;
			text-align: center;
			color: #9fb0c8;
		}
		/* One warning: the item's picture, the plain-words numbers, and the
		   kind on the right - so a long list can be skimmed by icon alone. */
		.warning-row {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 4px 6px;
			margin-top: 2px;
			border-left: 3px solid #4a5c7c;
			border-radius: 0 4px 4px 0;
			background: #141a25;
		}
		.row-icon { flex-shrink: 0; width: 24px; text-align: center; }
		.row-icon-fa { color: #8fa4c2; }
		.row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
		.row-title {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 0.9rem;
			color: #dfe5ec;
		}
		.row-text { font-size: 0.8rem; line-height: 1.35; color: #8a9ab3; }
		.row-kind {
			flex-shrink: 0;
			align-self: center;
			font-size: 0.7rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			white-space: nowrap;
			color: #7d8ca5;
		}
		/* Red = the plan cannot run as it stands, amber = it runs but wastes
		   something, blue = purely informational. */
		.warning-row.kind-input, .warning-row.kind-output, .warning-row.kind-pool { border-left-color: #d4663f; }
		.warning-row.kind-input .row-kind, .warning-row.kind-output .row-kind, .warning-row.kind-pool .row-kind { color: #e58a72; }
		.warning-row.kind-capacity { border-left-color: #c9962e; }
		.warning-row.kind-capacity .row-kind { color: #e0b56a; }
		.warning-row.kind-surplus { border-left-color: #4a6a8c; }
		.warning-row.kind-surplus .row-kind { color: #8fa4c2; }
		.warnings-hint {
			padding: 2px 8px 8px;
			font-size: 0.8rem;
			color: #8a9ab3;
		}
		@media (max-width: 480px) {
			.row-kind { display: none; }
		}
	`],
})
export class PlannerStatusBarComponent
{

	public readonly faTriangleExclamation = faTriangleExclamation;
	public readonly faBolt = faBolt;
	public readonly faIndustry = faIndustry;
	public readonly faLayerGroup = faLayerGroup;
	public readonly faDiagramProject = faDiagramProject;

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
	public readonly poolWarnings = computed<PoolResourceStatus[]>(() => {
		const plan = this.planManager.activePlan();
		if (!plan || this.planManager.activePlanReadOnly()) {
			return [];
		}
		return this.pool.overUsed(plan);
	});

	public readonly warningCount = computed(() =>
		this.warningEntries().reduce((sum, entry) => sum + entry.details.length, 0) + this.poolWarnings().length);

	/** The kind the list is narrowed to; null shows every warning. */
	private readonly warningFilterSignal = signal<GraphWarningKind | null>(null);

	/** The narrowing actually in force - a kind the plan no longer has drops itself. */
	public readonly warningFilter = computed<GraphWarningKind | null>(() => {
		const kind = this.warningFilterSignal();
		return kind !== null && this.warningFilters().some(chip => chip.kind === kind) ? kind : null;
	});

	/**
	 * One chip per kind of warning the plan actually has, so a long list can
	 * be cut down to "just the missing inputs" (and the counts alone already
	 * say what kind of trouble the plan is in).
	 */
	public readonly warningFilters = computed<WarningKindFilter[]>(() => {
		const counts = new Map<GraphWarningKind, number>();
		this.warningEntries().forEach(entry => entry.details.forEach(detail =>
			counts.set(detail.kind, (counts.get(detail.kind) ?? 0) + 1)));
		if (this.poolWarnings().length > 0) {
			counts.set('pool', this.poolWarnings().length);
		}
		return PlannerStatusBarComponent.KIND_ORDER
			.filter(kind => counts.has(kind))
			.map(kind => ({kind, label: this.kindLabel(kind), count: counts.get(kind) ?? 0}));
	});

	/** Warning-bearing nodes the chip selection leaves, with their own warnings narrowed the same way. */
	public readonly visibleEntries = computed<GraphWarningEntry[]>(() => {
		const kind = this.warningFilter();
		if (kind === null) {
			return this.warningEntries();
		}
		return this.warningEntries()
			.map(entry => ({...entry, details: entry.details.filter(detail => detail.kind === kind)}))
			.filter(entry => entry.details.length > 0);
	});

	public readonly visiblePoolWarnings = computed<PoolResourceStatus[]>(() => {
		const kind = this.warningFilter();
		return kind === null || kind === 'pool' ? this.poolWarnings() : [];
	});

	/** Chips are listed in the order trouble usually needs fixing in. */
	private static readonly KIND_ORDER: GraphWarningKind[] = ['input', 'output', 'capacity', 'surplus', 'pool'];

	/** Settings were pushed by the folder (or the pool moved) after the graph was solved. */
	public readonly recalculationNeeded = computed(() =>
		this.planManager.activePlan()?.metadata?.recalculationNeeded ?? false);

	public readonly graphDirty: Signal<boolean>;

	/** Automatic mode holding still because the graph was edited by hand. */
	public readonly automaticPaused = computed(() =>
		(this.planManager.activeSettings()?.calculationMode ?? 'automatic') === 'automatic'
		&& this.planManager.activePlanGraphDirty());

	private readonly graphNodes = computed(() => this.planManager.activePlan()?.graph?.nodes ?? []);

	/** How many times the open subplan is built in its parent; 0 when the plan is not a subplan. */
	public readonly subplanBuilds = computed(() => this.subplanBuildCounter.buildsOf(this.planManager.activePlan()));

	public readonly subplanBuildsText = computed(() => {
		const parent = this.subplanBuildCounter.parentOf(this.planManager.activePlan());
		const builds = this.subplanBuilds();
		return parent
			? `This subplan is built ${builds} times in ${parent.name}, so everything in it counts ${builds} times there.`
			: `This subplan is built ${builds} times in its parent plan.`;
	});

	public constructor(
		private readonly planManager: PlanManager,
		private readonly plannerGraph: PlannerGraphService,
		private readonly breakdownService: PlanBreakdownService,
		private readonly pool: ResourcePoolService,
		public readonly actions: PlannerActionsService,
		public readonly rateFormatter: RateFormatter,
		private readonly versionManager: VersionManager,
		private readonly subplanBuildCounter: SubplanBuildCounter,
	)
	{
		this.graphDirty = planManager.activePlanGraphDirty;
		this.warningEntries = plannerGraph.warningEntries;
	}

	public focusWarning(entry: GraphWarningEntry): void
	{
		this.plannerGraph.focusNode(entry.nodeId);
	}

	/** Clicking the selected chip again clears the filter. */
	public selectWarningFilter(kind: GraphWarningKind): void
	{
		this.warningFilterSignal.set(this.warningFilter() === kind ? null : kind);
	}

	public clearWarningFilter(): void
	{
		this.warningFilterSignal.set(null);
	}

	public kindLabel(kind: GraphWarningKind): string
	{
		switch (kind) {
			case 'input': return 'Missing input';
			case 'output': return 'Missing output';
			case 'surplus': return 'Unused output';
			case 'capacity': return 'Too few machines';
			case 'pool': return 'Over the shared limit';
		}
	}

	/** The pooled-resource warning in the same "name - what is wrong" shape as the node ones. */
	public poolWarningText(status: PoolResourceStatus): string
	{
		return `mines ${this.rateFormatter.rate(status.usedByPlan, status.item)}, `
			+ `only ${this.rateFormatter.rate(status.available ?? 0, status.item)} left in the shared pool`;
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
