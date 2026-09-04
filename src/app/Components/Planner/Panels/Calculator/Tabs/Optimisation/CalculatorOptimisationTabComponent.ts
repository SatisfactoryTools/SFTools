import {Component, ChangeDetectionStrategy} from '@angular/core';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {OptimisationDefaults} from '@src/Model/Planner/OptimisationDefaults';
import {OptimisationSettings} from '@src/Model/Planner/OptimisationSettings';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/**
 * What the solver minimises: raw resources (weighted per resource in the
 * Resources tab), the plan's inputs (weighted per input in the Input tab),
 * power and/or machine count, with weights setting their relative worth
 * (e.g. how much 1 MW costs compared to 1 machine). Defaults: resources,
 * power and input weights on with power weighted far below the resource
 * weights. At least one goal must stay enabled - the solver refuses to run
 * otherwise.
 */
@Component({
	selector: 'calculator-optimisation-tab',
	templateUrl: './CalculatorOptimisationTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [InfoNoteComponent],
})
export class CalculatorOptimisationTabComponent
{

	public constructor(
		private readonly planManager: PlanManager,
	)
	{
	}

	public get resourcesEnabled(): boolean
	{
		return this.optimisation()?.rawResources ?? true;
	}

	public get inputsEnabled(): boolean
	{
		return this.optimisation()?.inputs ?? true;
	}

	public get powerEnabled(): boolean
	{
		return this.optimisation()?.power ?? true;
	}

	public get machinesEnabled(): boolean
	{
		return this.optimisation()?.machines ?? false;
	}

	/** Input weights only count as a goal once the plan has inputs, so they do not silence the warning. */
	public get noneEnabled(): boolean
	{
		return !this.resourcesEnabled && !this.powerEnabled && !this.machinesEnabled && !(this.inputsEnabled && this.hasInputs);
	}

	/** Whether the active plan has inputs to price; folders have none. */
	public get hasInputs(): boolean
	{
		return (this.planManager.activePlan()?.inputs ?? []).some(input => input.itemClassName !== '' && input.amount > 0);
	}

	public get powerWeight(): number
	{
		return this.optimisation()?.powerWeight ?? OptimisationDefaults.powerWeight;
	}

	public get machinesWeight(): number
	{
		return this.optimisation()?.machinesWeight ?? OptimisationDefaults.machinesWeight;
	}

	public toggleResources(): void
	{
		this.update({rawResources: !this.resourcesEnabled});
	}

	public toggleInputs(): void
	{
		this.update({inputs: !this.inputsEnabled});
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
				inputs: this.inputsEnabled,
				...settings.optimisation,
				...partial,
			},
		});
	}

}
