import {Component, OnDestroy, ChangeDetectionStrategy, Signal, computed} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMap} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ItemRateComponent} from '@src/Components/Common/ItemRateComponent';
import {Item} from '@src/Model/Data/Entities/Item';
import {ResourceLimitRow} from '@src/Components/Planner/Panels/Calculator/Tabs/Resources/ResourceLimitRow';
import {ResourceWeightModeOption} from '@src/Components/Planner/Panels/Calculator/Tabs/Resources/ResourceWeightModeOption';
import {Data} from '@src/Model/Data/Data';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {PoolResourceStatus} from '@src/Model/Planner/Pool/PoolResourceStatus';
import {ResourcePoolService} from '@src/Model/Planner/Pool/ResourcePoolService';
import {ResourceWeightMode} from '@src/Model/Planner/ResourceWeightMode';
import {ResourceWeightResolver} from '@src/Model/Planner/ResourceWeightResolver';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {RateFormatter} from '@src/Model/RateFormatter';

@Component({
	selector: 'calculator-resources-tab',
	templateUrl: './CalculatorResourcesTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, GameIconComponent, ItemRateComponent, AppTooltipDirective, InfoNoteComponent],
	styles: [`
		tr.resource-row { cursor: pointer; }
		tr.resource-row:hover > td { background-color: rgba(255, 255, 255, 0.04); }
		tr.resource-disabled td:not(.toggle-cell) { opacity: 0.45; }
		.toggle-cell .form-check-input { display: block; margin: 0 auto; float: none; }
		/* As wide as "m³/min", so the numbers line up. */
		.unit-addon { min-width: 4.6em; justify-content: flex-start; }
		.pool-bar { height: 8px; background: #1d2733; }
		.pool-others { background: #d9a441; }
		.pool-plan { background: #5bc0de; }
		.pool-free { background: #1d2733; border: 1px solid #4e5d6c; }
		.pool-legend {
			display: inline-block;
			width: 12px;
			height: 8px;
			margin-right: 4px;
			vertical-align: middle;
			border-radius: 2px;
		}
	`],
})
export class CalculatorResourcesTabComponent implements OnDestroy
{

	public readonly faMap = faMap;

	public rows: ResourceLimitRow[] = [];

	public readonly modeOptions: ResourceWeightModeOption[] = [
		{mode: 'map', label: 'Automatic (from map resources)', description: 'The most abundant resource on the map weighs 1; rarer ones weigh more in proportion. Water and other unlimited resources weigh 0.01.'},
		{mode: 'limits', label: 'Automatic (from limits)', description: 'The resource with the largest limit gets weight 1. Rarer resources get a higher weight in proportion. Unlimited resources get 0.01.'},
		{mode: 'equal', label: 'All equal', description: 'Every resource has weight 1. The plan mines as little as possible in total.'},
		{mode: 'manual', label: 'Manual', description: 'Your own weights. They start from the values of the previous mode.'},
	];

	public readonly poolStatus: Signal<PoolResourceStatus[] | null> = computed(() => {
		const plan = this.planManager.activePlan();
		return plan ? this.pool.status(plan) : null;
	});

	public readonly folderUsage: Signal<Map<string, number> | null> = computed(() => {
		const folder = this.planManager.activeFolder();
		if (!folder || this.planManager.folderGroupMode(folder, 'resources') !== 'pool') {
			return null;
		}
		return this.pool.usageInFolder(folder.id);
	});

	public readonly weightsEnabled: Signal<boolean> = computed(() =>
		this.planManager.activeSettings()?.optimisation?.rawResources ?? true);

	public readonly weightMode: Signal<ResourceWeightMode> = computed(() => {
		const settings = this.planManager.activeSettings();
		return settings ? this.weightResolver.modeOf(settings) : 'map';
	});

	public readonly weights: Signal<Record<string, number>> = computed(() => {
		const settings = this.planManager.activeSettings();
		const data = this.versionManager.activeVersionData();
		return settings && data ? this.weightResolver.resolve(settings, this.limitsInForce(), data) : {};
	});

	private loadedKey: string | null = null;
	private readonly subscription = new Subscription();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly pool: ResourcePoolService,
		private readonly weightResolver: ResourceWeightResolver,
		public readonly rateFormatter: RateFormatter,
	)
	{
		this.loadFrom(this.planManager.activeSettings());

		this.subscription.add(
			toObservable(computed(() => [this.planManager.activeSettings(), this.weights()] as const)).subscribe(([settings]) => {
				// Skip echoes of this tab's own sync(); anything else replaces the row drafts.
				if (this.key(settings) !== this.loadedKey) {
					this.loadFrom(settings);
				}
			}),
		);
	}

	public get manual(): boolean
	{
		return this.weightMode() === 'manual';
	}

	public get modeDescription(): string
	{
		return this.modeOptions.find(option => option.mode === this.weightMode())?.description ?? '';
	}

	public iconHash(className: string): string | null
	{
		return this.versionManager.activeVersionData()?.iconForClassName(className) ?? null;
	}

	public weightText(className: string): string
	{
		return this.rateFormatter.weight(this.weights()[className] ?? 1);
	}

	public item(className: string): Item | null
	{
		return this.versionManager.activeVersionData()?.searchItemByClassName(className) ?? null;
	}

	public rateUnit(className: string): string
	{
		return this.rateFormatter.unit(this.item(className));
	}

	public folderUsageOf(row: ResourceLimitRow): number
	{
		return this.folderUsage()?.get(row.className) ?? 0;
	}

	public folderOverUse(row: ResourceLimitRow): boolean
	{
		const usage = this.folderUsageOf(row);
		if (!row.enabled) {
			return usage > 1e-6;
		}
		return !row.infinite && usage - row.limit > 1e-6;
	}

	public barSegments(status: PoolResourceStatus): {others: number; plan: number} | null
	{
		if (status.limit === null || status.limit <= 0) {
			return null;
		}
		const others = Math.min(100, status.usedByOthers / status.limit * 100);
		const plan = Math.min(100 - others, status.usedByPlan / status.limit * 100);
		return {others, plan};
	}

	/** Manual starts from the weights the previous mode produced. */
	public setMode(mode: ResourceWeightMode): void
	{
		const settings = this.planManager.activeSettings();
		const data = this.versionManager.activeVersionData();
		if (!settings || !data || mode === this.weightMode()) return;
		const resourceWeights = mode === 'manual' ? this.rounded(this.weights()) : undefined;
		this.planManager.updateActiveSettings({...settings, resourceWeightMode: mode, resourceWeights});
	}

	public get mapLimits(): Record<string, number> | null
	{
		return this.versionManager.activeVersionData()?.worldLimits ?? null;
	}

	public setAllEnabled(enabled: boolean): void
	{
		this.rows.forEach(row => row.enabled = enabled);
		this.sync();
	}

	public setFromMapLimits(): void
	{
		const limits = this.mapLimits;
		if (!limits) return;
		this.rows.forEach(row => {
			const limit = row.className === SpecialClasses.WaterItem ? undefined : limits[row.className];
			row.infinite = limit === undefined;
			if (limit !== undefined) {
				row.limit = limit;
			}
		});
		this.sync();
	}

	public toggleInfinite(row: ResourceLimitRow): void
	{
		row.infinite = !row.infinite;
		this.sync();
	}

	public setEnabled(row: ResourceLimitRow, enabled: boolean): void
	{
		row.enabled = enabled;
		this.sync();
	}

	public onRowClick(row: ResourceLimitRow, event: MouseEvent): void
	{
		const target = event.target as HTMLElement;
		if (target.closest('input, button, select, a, .input-group')) {
			return;
		}
		const checkbox = (event.currentTarget as HTMLElement).querySelector<HTMLInputElement>('input[type="checkbox"]');
		if (!checkbox || checkbox.disabled) {
			return;
		}
		this.setEnabled(row, !row.enabled);
	}

	public sync(): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;

		const limits: Record<string, number> = {};
		const disabled: string[] = [];
		const weights: Record<string, number> = {};
		this.rows.forEach(row => {
			if (!row.infinite) {
				limits[row.className] = Math.max(0, row.limit);
			}
			if (!row.enabled) {
				disabled.push(row.className);
			}
			weights[row.className] = isFinite(row.weight) && row.weight >= 0 ? this.weightResolver.round(row.weight) : 1;
		});
		const updated: PlanSettings = {
			...settings,
			resourceLimits: Object.keys(limits).length > 0 ? limits : undefined,
			disabledResources: disabled.length > 0 ? disabled.sort() : undefined,
			// Only manual mode stores weights; the other modes derive them.
			resourceWeights: this.manual ? weights : undefined,
		};
		this.loadedKey = this.key(updated);
		this.planManager.updateActiveSettings(updated);
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

	private limitsInForce(): Record<string, number>
	{
		const plan = this.planManager.activePlan();
		if (plan) {
			return this.pool.effectiveLimits(plan);
		}
		return this.planManager.activeFolder()?.settings?.resourceLimits ?? {};
	}

	private loadFrom(settings: PlanSettings | null): void
	{
		this.loadedKey = this.key(settings);
		this.rows = settings ? this.buildRows(settings, this.versionManager.activeVersionData()) : [];
	}

	private key(settings: PlanSettings | null): string | null
	{
		return settings
			? JSON.stringify([settings.resourceLimits ?? {}, settings.disabledResources ?? [], settings.resourceWeightMode ?? null, settings.resourceWeights ?? {}])
			: null;
	}

	private rounded(weights: Record<string, number>): Record<string, number>
	{
		return Object.fromEntries(Object.entries(weights).map(([className, weight]) => [className, this.weightResolver.round(weight)]));
	}

	private buildRows(settings: PlanSettings, data: Data | null): ResourceLimitRow[]
	{
		if (!data) return [];
		const limits = settings.resourceLimits ?? {};
		const disabled = new Set(settings.disabledResources ?? []);
		const weights = this.weights();

		return data.resources
			.map(className => {
				const limit = limits[className];
				return {
					className,
					name: data.searchItemByClassName(className)?.name ?? className,
					enabled: !disabled.has(className),
					limit: limit ?? 0,
					infinite: limit === undefined,
					weight: this.weightResolver.round(weights[className] ?? 1),
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}

}
