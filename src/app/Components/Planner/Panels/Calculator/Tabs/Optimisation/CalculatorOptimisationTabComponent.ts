import {Component, ChangeDetectionStrategy} from '@angular/core';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {OptimisationResourceRow} from '@src/Components/Planner/Panels/Calculator/Tabs/Optimisation/OptimisationResourceRow';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {OptimisationDefaults} from '@src/Model/Planner/OptimisationDefaults';
import {OptimisationSettings} from '@src/Model/Planner/OptimisationSettings';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/**
 * What the solver minimises: raw resources (weighted per resource), power
 * and/or machine count, with weights setting their relative worth (e.g. how
 * much 1 MW costs compared to 1 machine). Defaults: resources + power on
 * with power weighted far below the resource weights. At least one goal must
 * stay enabled - the solver refuses to run otherwise.
 */
@Component({
	selector: 'calculator-optimisation-tab',
	templateUrl: './CalculatorOptimisationTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [GameIconComponent],
})
export class CalculatorOptimisationTabComponent
{

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
	)
	{
	}

	public iconHash(className: string): string | null
	{
		return this.versionManager.activeVersionData()?.iconForClassName(className) ?? null;
	}

	public get resourcesEnabled(): boolean
	{
		return this.optimisation()?.rawResources ?? true;
	}

	public get powerEnabled(): boolean
	{
		return this.optimisation()?.power ?? true;
	}

	public get machinesEnabled(): boolean
	{
		return this.optimisation()?.machines ?? false;
	}

	public get noneEnabled(): boolean
	{
		return !this.resourcesEnabled && !this.powerEnabled && !this.machinesEnabled;
	}

	public get powerWeight(): number
	{
		return this.optimisation()?.powerWeight ?? OptimisationDefaults.powerWeight;
	}

	public get machinesWeight(): number
	{
		return this.optimisation()?.machinesWeight ?? OptimisationDefaults.machinesWeight;
	}

	public get resourceRows(): OptimisationResourceRow[]
	{
		const data = this.versionManager.activeVersionData();
		if (!data) return [];
		const overrides = this.optimisation()?.resourceWeights;

		return data.resources
			.map(className => ({
				className,
				name: data.searchItemByClassName(className)?.name ?? className,
				weight: OptimisationDefaults.resourceWeight(className, overrides),
				defaultWeight: OptimisationDefaults.resourceWeights[className] ?? 1,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	public toggleResources(): void
	{
		this.update({rawResources: !this.resourcesEnabled});
	}

	public togglePower(): void
	{
		this.update({power: !this.powerEnabled});
	}

	public toggleMachines(): void
	{
		this.update({machines: !this.machinesEnabled});
	}

	public setPowerWeight(value: number): void
	{
		if (isFinite(value) && value >= 0) {
			this.update({powerWeight: value});
		}
	}

	public setMachinesWeight(value: number): void
	{
		if (isFinite(value) && value >= 0) {
			this.update({machinesWeight: value});
		}
	}

	/** Values matching the default are stored as "no override", keeping the settings lean. */
	public setResourceWeight(row: OptimisationResourceRow, value: number): void
	{
		if (!isFinite(value) || value < 0) {
			return;
		}
		const weights = {...this.optimisation()?.resourceWeights};
		if (value === row.defaultWeight) {
			delete weights[row.className];
		} else {
			weights[row.className] = value;
		}
		this.update({resourceWeights: Object.keys(weights).length > 0 ? weights : undefined});
	}

	private optimisation(): OptimisationSettings | undefined
	{
		return this.planManager.activeSettings()?.optimisation;
	}

	private update(partial: Partial<OptimisationSettings>): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		this.planManager.updateActiveSettings({
			...settings,
			optimisation: {
				// Persist the effective flags explicitly so a partial edit
				// never flips the absent-means-default fields by accident.
				rawResources: this.resourcesEnabled,
				power: this.powerEnabled,
				machines: this.machinesEnabled,
				...settings.optimisation,
				...partial,
			},
		});
	}

}
