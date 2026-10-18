import {Component, ChangeDetectionStrategy} from '@angular/core';
import {ItemPickerComponent} from '@src/Components/Common/ItemPickerComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';

/** Shown when no plan is open: picking an item starts a plan, so nobody has to learn about plans first. */
@Component({
	selector: 'calculator-quick-start',
	templateUrl: './CalculatorQuickStartComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [ItemPickerComponent],
	styles: `
		.quick-start {
			max-width: 32rem;
		}
	`,
})
export class CalculatorQuickStartComponent
{

	private static readonly DEFAULT_RATE = 10;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly actions: PlannerActionsService,
	)
	{
	}

	public get hasPlans(): boolean
	{
		return this.planManager.plans().length > 0;
	}

	public get itemOptions(): ItemPickerOption[]
	{
		const data = this.versionManager.activeVersionData();
		const items = [...(data?.getAutomatableItems() ?? [])].sort((a, b) => a.name.localeCompare(b.name));
		return [
			{value: SpecialClasses.PowerTarget, label: 'Power (generators)', iconHash: null},
			{value: SpecialClasses.SinkPointsTarget, label: 'Sink points (AWESOME Sink)', iconHash: data?.iconForClassName(SpecialClasses.SinkCouponItem) ?? null},
			...items.map(item => ({value: item.className, label: item.name, iconHash: item.icon})),
		];
	}

	public start(itemClassName: string): void
	{
		if (itemClassName === '') {
			return;
		}
		const plan = this.planManager.createPlan('', null);
		this.planManager.setActivePlan(plan.id);
		this.planManager.setRequests(plan.id, [{itemClassName, ratePerMinute: CalculatorQuickStartComponent.DEFAULT_RATE}]);
		// The auto-recalc watcher ignores plan switches, and this plan got its first item in the same tick it was opened.
		if (this.planManager.activeSettings()?.calculationMode === 'automatic') {
			this.actions.requestCalculate();
		}
	}

}
