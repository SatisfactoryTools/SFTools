import {Component, ChangeDetectionStrategy, Signal, computed} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faShareNodes} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
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
			border-radius: 5px;
			background: transparent;
			color: #8899bb;
			font-size: 16px;
			cursor: pointer;
			transition: background 0.15s, color 0.15s;
		}
		.rail-btn:hover { background: rgba(255,255,255,0.08); color: #ccd6ee; }
		.rail-btn.active { background: rgba(100,150,255,0.18); color: #fff; }
		.rail-btn:disabled { opacity: 0.35; cursor: default; }
		.rail-btn:disabled:hover { background: transparent; color: #8899bb; }
		/* Share is an action, not a panel, and people looked for it in vain - it gets the
		   same blue as the Share button in the production request panel. The solid fill
		   keeps it apart from an open panel, which is only a faint blue tint. */
		.rail-btn-accent {
			background: #4c9be8;
			color: #fff;
		}
		.rail-btn-accent:hover { background: #6aaeee; color: #fff; }
		.rail-btn-accent:disabled:hover { background: #4c9be8; color: #fff; }
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

	public readonly faShareNodes = faShareNodes;

	/** Says what the button would share, or why it cannot - a disabled icon on its own explains nothing. */
	public readonly shareTooltip: Signal<string> = computed(() => {
		const target = this.shareDialog.activeTarget();
		if (target === null) {
			return 'Share - open a plan of yours first';
		}
		const what = target.type === 'folder' ? `Share folder "${target.name}"` : `Share "${target.name}"`;
		return what + this.hotkeys.suffix('plans.sharePlan');
	});

	public constructor(
		public readonly layout: PanelLayoutService,
		public readonly hotkeys: HotkeyService,
		public readonly shareDialog: ShareDialogService,
	)
	{
	}

}
