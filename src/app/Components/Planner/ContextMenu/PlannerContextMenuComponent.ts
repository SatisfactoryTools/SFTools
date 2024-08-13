import {ChangeDetectionStrategy, Component, ElementRef, HostListener} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenuService} from '@src/Components/Planner/ContextMenu/PlannerContextMenuService';

const MENU_WIDTH = 240;
const MENU_HEIGHT = 160;

@Component({
	selector: 'planner-context-menu',
	templateUrl: './PlannerContextMenuComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
})
export class PlannerContextMenuComponent
{

	public constructor(
		public readonly contextMenu: PlannerContextMenuService,
		private readonly elementRef: ElementRef<HTMLElement>,
	)
	{
	}

	public get left(): number
	{
		return Math.max(0, Math.min(this.contextMenu.position().x, window.innerWidth - MENU_WIDTH));
	}

	public get top(): number
	{
		return Math.max(0, Math.min(this.contextMenu.position().y, window.innerHeight - MENU_HEIGHT));
	}

	public run(item: ContextMenuItem): void
	{
		if (item.disabled) {
			return;
		}
		this.contextMenu.close();
		item.action();
	}

	@HostListener('document:mousedown', ['$event'])
	public onDocumentMouseDown(event: MouseEvent): void
	{
		if (!this.contextMenu.menu()) {
			return;
		}
		if (this.elementRef.nativeElement.contains(event.target as globalThis.Node)) {
			return;
		}
		this.contextMenu.close();
	}

	@HostListener('document:keydown.escape')
	public onEscape(): void
	{
		this.contextMenu.close();
	}

}
