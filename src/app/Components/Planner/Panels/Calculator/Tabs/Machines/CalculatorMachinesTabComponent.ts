import {Component, ChangeDetectionStrategy} from '@angular/core';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {Data} from '@src/Model/Data/Data';
import {Building} from '@src/Model/Data/Entities/Building';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/**
 * Machine selection for the solver: all production machines are enabled by
 * default; recipes producible only in disabled machines are excluded from
 * the solver's pool (shown struck through in the Recipes tab).
 */
@Component({
	selector: 'calculator-machines-tab',
	templateUrl: './CalculatorMachinesTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [GameIconComponent],
})
export class CalculatorMachinesTabComponent
{

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
	)
	{
	}

	public get machines(): Building[]
	{
		return this.data()?.getProductionMachines() ?? [];
	}

	public isEnabled(machine: Building): boolean
	{
		return !this.disabledSet().has(machine.className);
	}

	public toggle(machine: Building): void
	{
		const disabled = this.disabledSet();
		disabled.has(machine.className) ? disabled.delete(machine.className) : disabled.add(machine.className);
		this.persist(disabled);
	}

	public setAll(value: boolean): void
	{
		this.persist(value ? new Set() : new Set(this.machines.map(machine => machine.className)));
	}

	public recipeCount(machine: Building): number
	{
		return this.data()?.getRecipesForBuilding(machine.className).length ?? 0;
	}

	private disabledSet(): Set<string>
	{
		return new Set(this.planManager.activeSettings()?.disabledMachines ?? []);
	}

	private persist(disabled: Set<string>): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		this.planManager.updateActiveSettings({
			...settings,
			disabledMachines: disabled.size > 0 ? [...disabled].sort() : undefined,
		});
	}

	private data(): Data | null
	{
		return this.versionManager.activeVersionData();
	}

}
