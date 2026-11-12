import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRotateLeft, faArrowRotateRight, faExpand, faImage, faLock, faLockOpen, faMinus, faPlus, faUpDownLeftRight} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GraphExportDialogService} from '@src/Components/Planner/Export/GraphExportDialogService';
import {GraphHistoryService} from '@src/Components/Planner/GraphHistoryService';
import {GraphLayoutLockService} from '@src/Components/Planner/GraphLayoutLockService';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';

@Component({
	selector: 'planner-zoom-controls',
	templateUrl: './PlannerZoomControlsComponent.html',
	imports: [FaIconComponent, AppTooltipDirective],
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host {
			display: flex;
			flex-direction: column;
			background: #1b2834;
			border: 1px solid #34475a;
			overflow: hidden;
		}
		.zb {
			width: 30px;
			height: 28px;
			display: flex;
			align-items: center;
			justify-content: center;
			border: none;
			border-bottom: 1px solid #34475a;
			background: transparent;
			color: #9fb0c0;
			font-size: 15px;
			line-height: 1;
			cursor: pointer;
		}
		.zb:last-child { border-bottom: none; }
		.zb:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; }
		.zb:disabled { color: #4a5d71; cursor: default; }
		.zb-on, .zb-on:hover:not(:disabled) { color: #f0ad4e; }
		.lock-icon {
			position: relative;
			display: inline-block;
			line-height: 1;
		}
		.lock-badge {
			position: absolute;
			right: -6px;
			bottom: -5px;
			font-size: 9px;
			padding: 1px;
			background: #1b2834;
		}
		.zb:hover:not(:disabled) .lock-badge { background: #2e3a46; }
	`],
})
export class PlannerZoomControlsComponent
{

	public readonly faPlus = faPlus;
	public readonly faMinus = faMinus;
	public readonly faExpand = faExpand;
	public readonly faArrowRotateLeft = faArrowRotateLeft;
	public readonly faArrowRotateRight = faArrowRotateRight;
	public readonly faImage = faImage;
	public readonly faUpDownLeftRight = faUpDownLeftRight;
	public readonly faLock = faLock;
	public readonly faLockOpen = faLockOpen;

	public constructor(
		private readonly plannerGraph: PlannerGraphService,
		private readonly actions: PlannerActionsService,
		public readonly history: GraphHistoryService,
		public readonly hotkeys: HotkeyService,
		private readonly exportDialog: GraphExportDialogService,
		public readonly layoutLock: GraphLayoutLockService,
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

	public exportImage(): void
	{
		this.exportDialog.open();
	}

}
