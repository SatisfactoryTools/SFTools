import {Component, ChangeDetectionStrategy, Signal, computed} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPlus, faShareNodes} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {PlanCreator} from '@src/Components/Planner/Panels/Plans/PlanCreator';
import {ShareDialogService} from '@src/Components/Planner/Share/ShareDialogService';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';

@Component({
	selector: 'planner-rail',
	templateUrl: './PlannerRailComponent.html',
	imports: [FaIconComponent, AppTooltipDirective],
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
			background: transparent;
			color: #9fb0c0;
			font-size: 16px;
			cursor: pointer;
			transition: background 0.15s, color 0.15s;
		}
		.rail-btn:hover { background: rgba(255,255,255,0.08); color: #d5dde6; }
		.rail-btn.active { background: rgba(var(--bs-primary-rgb), 0.18); color: #fff; }
		.rail-btn:disabled { opacity: 0.35; cursor: default; }
		.rail-btn:disabled:hover { background: transparent; color: #9fb0c0; }
		.rail-btn-new {
			background: var(--bs-success);
			color: #fff;
		}
		.rail-btn-new:hover { background: #74c374; color: #fff; }
		.rail-btn-accent {
			background: var(--sf-blue);
			color: #fff;
		}
		.rail-btn-accent:hover { background: var(--sf-blue-hover); color: #fff; }
		.rail-btn-accent:disabled:hover { background: var(--sf-blue); color: #fff; }
		.rail-sep {
			width: 20px;
			height: 1px;
			margin: 4px 0;
			background: rgba(255,255,255,0.12);
		}
	`],
})
export class PlannerRailComponent
{

	public readonly faPlus = faPlus;
	public readonly faShareNodes = faShareNodes;

	public readonly shareTooltip: Signal<string> = computed(() => {
		const target = this.shareDialog.activeTarget();
		if (target === null) {
			return 'Open one of your plans to share it';
		}
		const what = target.type === 'folder' ? `Share folder "${target.name}"` : `Share "${target.name}"`;
		return what + this.hotkeys.suffix('plans.sharePlan');
	});

	public constructor(
		public readonly layout: PanelLayoutService,
		public readonly hotkeys: HotkeyService,
		public readonly shareDialog: ShareDialogService,
		public readonly planCreator: PlanCreator,
	)
	{
	}

}
