import {Component, ChangeDetectionStrategy, Signal, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faChevronRight, faRecycle} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {PowerDrawComponent} from '@src/Components/Common/PowerDrawComponent';
import {CollapsibleCardComponent} from '@src/Components/Common/CollapsibleCardComponent';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {OverviewCard} from '@src/Components/Planner/Panels/Overview/OverviewCard';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {BuildCostBreakdown} from '@src/Model/Planner/Breakdown/BuildCostBreakdown';
import {BuildCostRow} from '@src/Model/Planner/Breakdown/BuildCostRow';
import {FolderOverview} from '@src/Model/Planner/Breakdown/FolderOverview';
import {FolderOverviewService} from '@src/Model/Planner/Breakdown/FolderOverviewService';
import {FolderRecipeRow} from '@src/Model/Planner/Breakdown/FolderRecipeRow';
import {FolderResourceRow} from '@src/Model/Planner/Breakdown/FolderResourceRow';
import {PlanBreakdownService} from '@src/Model/Planner/Breakdown/PlanBreakdownService';
import {PowerBreakdown} from '@src/Model/Planner/Breakdown/PowerBreakdown';
import {ProductionRow} from '@src/Model/Planner/Breakdown/ProductionRow';
import {RecipeUsageRow} from '@src/Model/Planner/Breakdown/RecipeUsageRow';
import {ResourceUsageRow} from '@src/Model/Planner/Breakdown/ResourceUsageRow';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PoolResourceStatus} from '@src/Model/Planner/Pool/PoolResourceStatus';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {ResourcePoolService} from '@src/Model/Planner/Pool/ResourcePoolService';
import {ResourceConversionRecipeResolver} from '@src/Model/Planner/ResourceConversionRecipeResolver';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * At-a-glance summary of the active plan as a set of collapsible cards:
 * raw resources against their caps, artifacts, products and byproducts,
 * buildings, power balance and the recipes in use. Every figure comes from
 * the same breakdowns the detailed panels show, subplans included. Cards
 * flow into columns by the panel's own width, not the viewport's. With a
 * folder selected the same cards sum every plan of the folder (subfolders
 * and subplans included), each row expandable into its per-plan split.
 */
@Component({
	selector: 'planner-overview',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerOverviewComponent.html',
	imports: [FaIconComponent, GameIconComponent, CollapsibleCardComponent, InfoNoteComponent, PowerDrawComponent],
	styles: [`
		.overview-grid {
			container-type: inline-size;
		}
		.overview-col {
			flex: 0 0 100%;
			max-width: 100%;
		}
		@container (min-width: 620px) {
			.overview-col { flex: 0 0 50%; max-width: 50%; }
		}
		@container (min-width: 960px) {
			.overview-col { flex: 0 0 33.3333%; max-width: 33.3333%; }
		}
		.limit-bar {
			height: 4px;
			background: rgba(255, 255, 255, 0.08);
			border-radius: 2px;
			overflow: hidden;
		}
		.limit-bar > div { height: 100%; }
		/* Resources switched off in the settings fade; a red usage still shows through. */
		tr.resource-off td:first-child { opacity: 0.5; }
		/* Below the resources table, set apart from the rows it summarises. */
		.conversion-note {
			border-top: 2px solid #5d7189;
			background: rgba(0, 0, 0, 0.15);
		}
	`],
})
export class PlannerOverviewComponent
{

	public readonly faChevronDown = faChevronDown;
	public readonly faChevronRight = faChevronRight;
	public readonly faRecycle = faRecycle;

	public readonly cards: readonly {id: OverviewCard; title: string}[] = [
		{id: 'resources', title: 'Resources'},
		{id: 'artifacts', title: 'Artifacts'},
		{id: 'production', title: 'Production'},
		{id: 'buildings', title: 'Buildings'},
		{id: 'power', title: 'Power'},
		{id: 'recipes', title: 'Recipes'},
	];

	private readonly collapsedSignal = signal<ReadonlySet<OverviewCard>>(new Set());

	private readonly showAllRecipesSignal = signal(false);
	public readonly showAllRecipes = this.showAllRecipesSignal.asReadonly();

	public readonly isFolderView = computed(() => this.planManager.activeFolder() !== null);

	/** Folder totals with per-plan splits; null while a plan (or nothing) is selected. */
	public readonly folderOverview: Signal<FolderOverview | null> = computed(() => {
		const folder = this.planManager.activeFolder();
		return folder ? this.folderOverviewService.overview(folder) : null;
	});

	public readonly folderRecipes: Signal<FolderRecipeRow[]> = computed(() => {
		const rows = this.folderOverview()?.recipes ?? [];
		return this.showAllRecipes() ? rows : rows.filter(row => row.recipe.alternate);
	});

	public readonly outdatedPlanCount = computed(() => this.folderOverview()?.plans.filter(plan => plan.outdated).length ?? 0);

	public readonly manualPlanCount = computed(() => this.folderOverview()?.plans.filter(plan => plan.manual).length ?? 0);

	/** Folder rows expanded into their per-plan split, by row key. */
	private readonly expandedRowsSignal = signal<ReadonlySet<string>>(new Set());

	public readonly hasPlan = computed(() => this.planManager.activePlan() !== null);

	public readonly resources: Signal<ResourceUsageRow[]> = computed(() =>
		this.breakdownService.resources(this.planManager.activePlan()));

	/** Pool shares when the plan's folder pools raw resources; the card then shows those instead of plain limits. */
	public readonly poolStatus: Signal<PoolResourceStatus[] | null> = computed(() => {
		const plan = this.planManager.activePlan();
		return plan ? this.pool.status(plan) : null;
	});

	public readonly production: Signal<ProductionRow[]> = computed(() =>
		this.breakdownService.production(this.planManager.activePlan()));

	public readonly buildCost: Signal<BuildCostBreakdown> = computed(() =>
		this.breakdownService.buildCost(this.planManager.activePlan()));

	/** Building rows only - subplans are already folded into them by count, and their row would double up. */
	public readonly buildings: Signal<BuildCostRow[]> = computed(() => this.buildCost().rows);

	public readonly power: Signal<PowerBreakdown> = computed(() =>
		this.breakdownService.power(this.planManager.activePlan()));

	private readonly allRecipes: Signal<RecipeUsageRow[]> = computed(() =>
		this.breakdownService.recipes(this.planManager.activePlan()));

	public readonly recipes: Signal<RecipeUsageRow[]> = computed(() =>
		this.showAllRecipes() ? this.allRecipes() : this.allRecipes().filter(row => row.recipe.alternate));

	/** Class names of the version's resource conversion recipes; empty hides the conversion row. */
	private readonly conversionRecipeClasses: Signal<ReadonlySet<string>> = computed(() => {
		const data = this.versionManager.activeVersionData();
		return new Set(data ? this.conversions.resolve(data).map(recipe => recipe.className) : []);
	});

	/**
	 * Whether the plan (or any of the folder's plans) turns raw resources into
	 * other raw resources; null when the version has no such recipes.
	 */
	public readonly conversionUsed: Signal<boolean | null> = computed(() => {
		const classes = this.conversionRecipeClasses();
		if (classes.size === 0) {
			return null;
		}
		const rows = this.folderOverview()?.recipes ?? this.allRecipes();
		return rows.some(row => classes.has(row.recipe.className));
	});

	public readonly shardIcon = computed(() =>
		this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.PowerShardItem) ?? null);
	public readonly sloopIcon = computed(() =>
		this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.SomersloopItem) ?? null);

	public constructor(
		private readonly planManager: PlanManager,
		private readonly breakdownService: PlanBreakdownService,
		private readonly versionManager: VersionManager,
		private readonly pool: ResourcePoolService,
		private readonly folderOverviewService: FolderOverviewService,
		private readonly conversions: ResourceConversionRecipeResolver,
		public readonly rateFormatter: RateFormatter,
	)
	{
	}

	public isRowExpanded(key: string): boolean
	{
		return this.expandedRowsSignal().has(key);
	}

	public toggleRow(key: string): void
	{
		const keys = new Set(this.expandedRowsSignal());
		keys.has(key) ? keys.delete(key) : keys.add(key);
		this.expandedRowsSignal.set(keys);
	}

	/** A plan name in a breakdown opens that plan. */
	public openPlan(planId: string): void
	{
		this.planManager.setActivePlan(planId);
	}

	/** Folder resources: share of the folder cap in use (pooled: of the whole pool); null without a cap. */
	public folderLimitFraction(row: FolderResourceRow): number | null
	{
		if (row.limit === null || row.disabled) {
			return null;
		}
		return row.limit > 0 ? Math.min(1, row.used / row.limit) : (row.used > 0 ? 1 : 0);
	}

	/** Only a pooled cap is a folder-wide budget; a fixed cap applies per plan, so the total may exceed it legitimately. */
	public folderExceedsLimit(row: FolderResourceRow): boolean
	{
		if (row.disabled) {
			return row.used > 1e-6;
		}
		return this.folderOverview()?.resourcesMode === 'pool' && row.limit !== null && row.used - row.limit > 1e-6;
	}

	public folderNetPower(): PowerDraw
	{
		return this.folderOverview()?.netPower ?? PowerDraw.ZERO;
	}

	/** A surplus reads green, a deficit (or nothing) amber. */
	public isSurplus(net: PowerDraw): boolean
	{
		return net.average > 0 && !this.rateFormatter.isZero(net.average);
	}

	/** Share of the available pool this plan uses, capped for the bar; null when unlimited. */
	public poolFraction(status: PoolResourceStatus): number | null
	{
		if (status.available === null) {
			return null;
		}
		return status.available > 0 ? Math.min(1, status.usedByPlan / status.available) : (status.usedByPlan > 0 ? 1 : 0);
	}

	public isCollapsed(card: OverviewCard): boolean
	{
		return this.collapsedSignal().has(card);
	}

	public toggleCard(card: OverviewCard): void
	{
		const cards = new Set(this.collapsedSignal());
		cards.has(card) ? cards.delete(card) : cards.add(card);
		this.collapsedSignal.set(cards);
	}

	public setShowAllRecipes(showAll: boolean): void
	{
		this.showAllRecipesSignal.set(showAll);
	}

	/** Share of the cap in use, capped at 100% for the bar; null when unlimited. */
	public limitFraction(row: ResourceUsageRow): number | null
	{
		if (row.limit === null || row.disabled) {
			return null;
		}
		return row.limit > 0 ? Math.min(1, row.used / row.limit) : (row.used > 0 ? 1 : 0);
	}

	/** Over the cap by more than float noise - the solver only lands here for locked or hand-edited nodes. */
	public exceedsLimit(row: ResourceUsageRow): boolean
	{
		if (row.disabled) {
			return row.used > 1e-6;
		}
		return row.limit !== null && row.used - row.limit > 1e-6;
	}

	/** The cap shown after the usage: "off" for a switched-off resource, "∞" when unlimited. */
	public limitText(row: ResourceUsageRow): string
	{
		if (row.disabled) {
			return 'off';
		}
		if (row.limit === null) {
			return '∞';
		}
		return this.rateFormatter.rate(row.limit, row.item);
	}

	public netIsSurplus(): boolean
	{
		return this.isSurplus(this.power().net);
	}

}
