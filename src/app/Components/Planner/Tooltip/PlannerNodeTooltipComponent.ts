import {ChangeDetectionStrategy, Component} from '@angular/core';
import {PlannerNodeTooltipService} from '@src/Components/Planner/Tooltip/PlannerNodeTooltipService';

const TOOLTIP_WIDTH = 280;
const TOOLTIP_HEIGHT = 120;

@Component({
	selector: 'planner-node-tooltip',
	templateUrl: './PlannerNodeTooltipComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
})
export class PlannerNodeTooltipComponent
{

	public constructor(public readonly tooltip: PlannerNodeTooltipService)
	{
	}

	public get left(): number
	{
		return Math.max(0, Math.min(this.tooltip.position().x, window.innerWidth - TOOLTIP_WIDTH));
	}

	public get top(): number
	{
		return Math.max(0, Math.min(this.tooltip.position().y, window.innerHeight - TOOLTIP_HEIGHT));
	}

}
