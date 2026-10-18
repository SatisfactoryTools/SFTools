import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {PlanManager} from '@src/Model/Planner/PlanManager';

@Component({
	selector: 'plan-result-hint',
	template: '<info-note>{{ text }}</info-note>',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [InfoNoteComponent],
})
export class PlanResultHintComponent
{

	/** What the panel shows, e.g. "its item flows". */
	@Input({required: true}) public subject = '';

	@Input() public folderView = false;

	public constructor(private readonly planManager: PlanManager)
	{
	}

	public get text(): string
	{
		if (this.folderView) {
			return 'No plans in this folder yet.';
		}
		const plan = this.planManager.activePlan();
		if (!plan) {
			return `Open a plan to see ${this.subject}.`;
		}
		if (!plan.requests.some(request => request.itemClassName !== '')) {
			return `Add an item in Production request, or add nodes to the graph by hand, to see ${this.subject}.`;
		}
		if (this.planManager.activeSettings()?.calculationMode !== 'automatic') {
			return `Press Calculate to see ${this.subject}.`;
		}
		return 'Nothing calculated yet. See the Production request panel.';
	}

}
