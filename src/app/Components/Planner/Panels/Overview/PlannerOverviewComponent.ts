import {Component, ChangeDetectionStrategy, Signal, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faChevronRight, faRecycle} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {PowerDrawComponent} from '@src/Components/Common/PowerDrawComponent';
import {CollapsedSectionsService} from '@src/Components/Common/CollapsedSectionsService';
import {CollapsibleSections} from '@src/Components/Common/CollapsibleSections';
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

@Component({
	selector: 'planner-overview',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerOverviewComponent.html',
	imports: [FaIconComponent, GameIconComponent, CollapsibleCardComponent, InfoNoteComponent, PowerDrawComponent],
	styles: [`
		.overview-grid {
			container-type: inline-size;
		}
		/* Each column is its own "panel" container, so the narrow-table rules see the card's width, not the panel's. */
		.overview-col {
			flex: 0 0 100%;
			max-width: 100%;
			container-type: inline-size;
			container-name: panel;
		}
		@container (min-width: 620px) {
			.overview-col { flex: 0 0 50%; max-width: 50%; }
		}
		@container (min-width: 960px) {
			.overview-col { flex: 0 0 33.3333%; max-width: 33.3333%; }
		}
		tr.has-limit-bar { position: relative; }
		tr.has-limit-bar > td { padding-bottom: 0.6rem; }
		.limit-bar {
			position: absolute;
			left: 0;
			right: 0;
			bottom: 1px;
			height: 4px;
			background: rgba(255, 255, 255, 0.08);
			overflow: hidden;
		}
		.limit-bar > div { height: 100%; }
		tr.resource-off td:first-child { opacity: 0.5; }
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

	public readonly foldState: CollapsibleSections;

	private readonly showAllRecipesSignal = signal(false);
	public readonly showAllRecipes = this.showAllRecipesSignal.asReadonly();

	public readonly isFolderView = computed(() => this.planManager.activeFolder() !== null);

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

	private readonly expandedRowsSignal = signal<ReadonlySet<string>>(new Set());

	public readonly hasPlan = computed(() => this.planManager.activePlan() !== null);

	public readonly resources: Signal<ResourceUsageRow[]> = computed(() =>
		this.breakdownService.resources(this.planManager.activePlan()));

	public readonly poolStatus: Signal<PoolResourceStatus[] | null> = computed(() => {
		const plan = this.planManager.activePlan();
		return plan ? this.pool.status(plan) : null;
	});

	public readonly production: Signal<ProductionRow[]> = computed(() =>
		this.breakdownService.production(this.planManager.activePlan()));

	public readonly hasGraph = computed(() => (this.planManager.activePlan()?.graph?.nodes.length ?? 0) > 0);

	public readonly hasFolderGraphs = computed(() =>
		this.folderOverview()?.plans.some(plan => plan.buildings > 0 || plan.production > 0) ?? false);

	public readonly buildCost: Signal<BuildCostBreakdown> = computed(() =>
		this.breakdownService.buildCost(this.planManager.activePlan()));

	public readonly buildings: Signal<BuildCostRow[]> = computed(() => this.buildCost().rows);

	public readonly power: Signal<PowerBreakdown> = computed(() =>
		this.breakdownService.power(this.planManager.activePlan()));

	private readonly allRecipes: Signal<RecipeUsageRow[]> = computed(() =>
		this.breakdownService.recipes(this.planManager.activePlan()));

	public readonly recipes: Signal<RecipeUsageRow[]> = computed(() =>
		this.showAllRecipes() ? this.allRecipes() : this.allRecipes().filter(row => row.recipe.alternate));

	private readonly conversionRecipeClasses: Signal<ReadonlySet<string>> = computed(() => {
		const data = this.versionManager.activeVersionData();
		return new Set(data ? this.conversions.resolve(data).map(recipe => recipe.className) : []);
	});

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
		collapsedSections: CollapsedSectionsService,
		private readonly conversions: ResourceConversionRecipeResolver,
		public readonly rateFormatter: RateFormatter,
	)
	{
		this.foldState = new CollapsibleSections(collapsedSections, 'overview');
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

	public openPlan(planId: string): void
	{
		this.planManager.setActivePlan(planId);
	}

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

	public isSurplus(net: PowerDraw): boolean
	{
		return net.average > 0 && !this.rateFormatter.isZero(net.average);
	}

	public poolFraction(status: PoolResourceStatus): number | null
	{
		if (status.available === null) {
			return null;
		}
		return status.available > 0 ? Math.min(1, status.usedByPlan / status.available) : (status.usedByPlan > 0 ? 1 : 0);
	}

	public setShowAllRecipes(showAll: boolean): void
	{
		this.showAllRecipesSignal.set(showAll);
	}

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
