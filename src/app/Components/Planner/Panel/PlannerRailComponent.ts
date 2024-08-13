import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';

@Component({
	selector: 'planner-rail',
	templateUrl: './PlannerRailComponent.html',
	imports: [FaIconComponent, TooltipDirective],
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host {
			display: flex;
			flex-direction: column;
			align-items: center;
			width: 100%;
			height: 100%;
			padding-top: 8px;
			gap: 4px;
			user-select: none;
		}
		.rail-btn {
			width: 32px;
			height: 32px;
			display: flex;
			align-items: center;
			justify-content: center;
			border: none;
			border-radius: 5px;
			background: transparent;
			color: #8899bb;
			font-size: 16px;
			cursor: pointer;
			transition: background 0.15s, color 0.15s;
		}
		.rail-btn:hover { background: rgba(255,255,255,0.08); color: #ccd6ee; }
		.rail-btn.active { background: rgba(100,150,255,0.18); color: #fff; }
	`],
})
export class PlannerRailComponent
{

	public constructor(public readonly layout: PanelLayoutService)
	{
	}

}
