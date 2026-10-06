import {Component, ChangeDetectionStrategy} from '@angular/core';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {SloopAccuracyOption} from '@src/Components/Planner/Panels/Calculator/Tabs/Sloops/SloopAccuracyOption';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SloopAccuracy} from '@src/Model/Planner/SloopAccuracy';
import {SloopBudgetService} from '@src/Model/Planner/SloopBudgetService';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';

@Component({
	selector: 'calculator-sloops-tab',
	templateUrl: './CalculatorSloopsTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [GameIconComponent, InfoNoteComponent],
})
export class CalculatorSloopsTabComponent
{

	public readonly accuracyOptions: SloopAccuracyOption[] = [
		{value: 'low', label: 'Low', description: 'Fastest. The result may be worse than the best possible one.'},
		{value: 'medium', label: 'Medium', description: 'Closer to the best result, but slower.'},
		{value: 'high', label: 'High', description: 'Closest to the best result. Can take a long time.'},
	];

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly sloopBudget: SloopBudgetService,
	)
	{
	}

	public get sloopsUsedByLocked(): number
	{
		return this.sloopBudget.usedByLockedNodes(this.planManager.activePlan()?.graph);
	}

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

	public get producePowerForFactory(): boolean
	{
		return this.planManager.activeSettings()?.producePowerForFactory ?? false;
	}

	public get hasMaximiseRequest(): boolean
	{
		return this.planManager.activePlan()?.requests.some(request => request.mode === 'maximise') ?? false;
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
