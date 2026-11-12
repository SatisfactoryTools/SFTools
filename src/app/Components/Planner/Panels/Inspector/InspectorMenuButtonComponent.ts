import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faEllipsisVertical} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {PlannerContextMenuService} from '@src/Components/Planner/ContextMenu/PlannerContextMenuService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/** Opens the graph's own menu for the selection, so every action in it is also reachable without a right-click or long press. */
@Component({
	selector: 'inspector-menu-button',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, AppTooltipDirective],
	template: `
		@if (!planManager.activePlanReadOnly()) {
			<button
				class="btn btn-sm btn-outline-secondary py-0 px-1"
				type="button"
				aria-label="More actions"
				tooltip="More actions"
				container="body"
				placement="left"
				(mousedown)="onPress()"
				(touchstart)="onPress()"
				(click)="open($event)"
			><fa-icon [icon]="faEllipsisVertical" [fixedWidth]="true"></fa-icon></button>
		}
	`,
	styles: `:host { display: contents; }`,
})
export class InspectorMenuButtonComponent
{

	public readonly faEllipsisVertical = faEllipsisVertical;

	/** The open menu closes itself on this press, so the click that follows must not open it again. */
	private menuWasOpen = false;

	public constructor(
		private readonly plannerGraph: PlannerGraphService,
		private readonly contextMenu: PlannerContextMenuService,
		public readonly planManager: PlanManager,
	)
	{
	}

	public onPress(): void
	{
		this.menuWasOpen = this.contextMenu.menu() !== null;
	}

	public open(event: MouseEvent): void
	{
		if (this.menuWasOpen) {
			this.menuWasOpen = false;
			return;
		}
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		this.plannerGraph.openSelectionMenu(rect.left, rect.bottom);
	}

}
