import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLocationCrosshairs} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';

@Component({
	selector: 'go-to-node',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './GoToNodeButtonComponent.html',
	imports: [FaIconComponent, AppTooltipDirective],
	host: {class: 'd-inline-flex align-items-center'},
})
export class GoToNodeButtonComponent
{

	public readonly faLocationCrosshairs = faLocationCrosshairs;

	@Input({required: true}) public nodeIds: string[] = [];

	@Input() public placement: 'top' | 'bottom' | 'left' | 'right' = 'top';

	public constructor(
		private readonly plannerGraph: PlannerGraphService,
	)
	{
	}

	public get label(): string
	{
		return this.nodeIds.length > 1 ? `Show ${this.nodeIds.length} nodes on the graph` : 'Show on the graph';
	}

	/** Rows that hold the button toggle on click, so the click must not reach them. */
	public go(event: MouseEvent): void
	{
		event.stopPropagation();
		this.plannerGraph.focusNodes(this.nodeIds);
	}

}
