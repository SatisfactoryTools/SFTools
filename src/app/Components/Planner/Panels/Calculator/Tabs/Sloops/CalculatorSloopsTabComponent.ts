import {Component, ChangeDetectionStrategy} from '@angular/core';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {SloopAccuracyOption} from '@src/Components/Planner/Panels/Calculator/Tabs/Sloops/SloopAccuracyOption';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SloopAccuracy} from '@src/Model/Planner/SloopAccuracy';
import {SloopBudgetService} from '@src/Model/Planner/SloopBudgetService';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';

/**
 * Somersloop budget for the solver. Placing sloops turns the solve into a
 * MIP, so the accuracy setting trades solve time against how far the result
 * may deviate from the optimum.
 */
@Component({
	selector: 'calculator-sloops-tab',
	templateUrl: './CalculatorSloopsTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [GameIconComponent],
})
export class CalculatorSloopsTabComponent
{

	public readonly accuracyOptions: SloopAccuracyOption[] = [
		{value: 'low', label: 'Low', description: 'Fastest - the result may be off the optimum.'},
		{value: 'medium', label: 'Medium', description: 'Closer to the optimum, slower.'},
		{value: 'high', label: 'High', description: 'Closest to the optimum - can take a long time.'},
	];

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly sloopBudget: SloopBudgetService,
	)
	{
	}

	/** Somersloops already committed to locked recipe nodes in the current plan. */
	public get sloopsUsedByLocked(): number
	{
		return this.sloopBudget.usedByLockedNodes(this.planManager.activePlan()?.graph);
	}

	/** Somersloops left for the solver to place - the budget minus locked-node usage. */
	public get sloopsRemaining(): number
	{
		return this.sloopBudget.remaining(this.maxSloops, this.planManager.activePlan()?.graph);
	}

	public get somersloopIcon(): string | null
	{
		return this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.SomersloopItem) ?? null;
	}

	public get maxSloops(): number
	{
		return this.planManager.activeSettings()?.maxSloops ?? 0;
	}

	public get accuracy(): SloopAccuracy
	{
		return this.planManager.activeSettings()?.sloopAccuracy ?? 'low';
	}

	/** "Produce power to run the factory" (Power tab) - with sloops it makes the MIP much harder. */
	public get producePowerForFactory(): boolean
	{
		return this.planManager.activeSettings()?.producePowerForFactory ?? false;
	}

	public setMaxSloops(value: number): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings || !isFinite(value)) return;
		const sloops = Math.max(0, Math.round(value));
		this.planManager.updateActiveSettings({...settings, maxSloops: sloops > 0 ? sloops : undefined});
	}

	public setAccuracy(accuracy: SloopAccuracy): void
	{
		const settings = this.planManager.activeSettings();
		if (settings) {
			this.planManager.updateActiveSettings({...settings, sloopAccuracy: accuracy});
		}
	}

}
