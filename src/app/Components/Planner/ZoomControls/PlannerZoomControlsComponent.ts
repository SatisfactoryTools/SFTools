import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {faArrowRotateLeft, faArrowRotateRight, faExpand, faMinus, faPlus} from '@fortawesome/free-solid-svg-icons';
import {GraphHistoryService} from '@src/Components/Planner/GraphHistoryService';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';

@Component({
	selector: 'planner-zoom-controls',
	templateUrl: './PlannerZoomControlsComponent.html',
	imports: [FaIconComponent, TooltipDirective],
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host {
			display: flex;
			flex-direction: column;
			background: #10141d;
			border: 1px solid #222b3e;
			border-radius: 6px;
			overflow: hidden;
		}
		.zb {
			width: 30px;
			height: 28px;
			display: flex;
			align-items: center;
			justify-content: center;
			border: none;
			border-bottom: 1px solid #222b3e;
			background: transparent;
			color: #8899bb;
			font-size: 15px;
			line-height: 1;
			cursor: pointer;
		}
		.zb:last-child { border-bottom: none; }
		.zb:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; }
		.zb:disabled { color: #3a4654; cursor: default; }
	`],
})
export class PlannerZoomControlsComponent
{

	public readonly faPlus = faPlus;
	public readonly faMinus = faMinus;
	public readonly faExpand = faExpand;
	public readonly faArrowRotateLeft = faArrowRotateLeft;
	public readonly faArrowRotateRight = faArrowRotateRight;

	public constructor(
		private readonly plannerGraph: PlannerGraphService,
		private readonly actions: PlannerActionsService,
		public readonly history: GraphHistoryService,
	)
	{
	}

	public undo(): void
	{
		this.actions.requestUndo();
	}

	public redo(): void
	{
		this.actions.requestRedo();
	}

	public zoomIn(): void
	{
		this.plannerGraph.zoomIn();
	}

	public zoomOut(): void
	{
		this.plannerGraph.zoomOut();
	}

	public zoomFit(): void
	{
		this.plannerGraph.zoomFit();
	}

}
