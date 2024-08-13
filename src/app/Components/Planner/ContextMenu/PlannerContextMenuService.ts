import {Injectable, Signal, signal} from '@angular/core';
import {ContextMenuPosition} from '@src/Components/Planner/ContextMenu/ContextMenuPosition';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';

/**
 * Holds the currently open planner context menu (if any) and its screen
 * position, so the menu component can render it as a fixed overlay.
 */
@Injectable()
export class PlannerContextMenuService
{

	private readonly menuSignal = signal<PlannerContextMenu | null>(null);
	public readonly menu: Signal<PlannerContextMenu | null> = this.menuSignal.asReadonly();

	private readonly positionSignal = signal<ContextMenuPosition>({x: 0, y: 0});
	public readonly position: Signal<ContextMenuPosition> = this.positionSignal.asReadonly();

	public open(menu: PlannerContextMenu, x: number, y: number): void
	{
		this.positionSignal.set({x, y});
		this.menuSignal.set(menu);
	}

	public close(): void
	{
		this.menuSignal.set(null);
	}

}
