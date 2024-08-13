import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';

/**
 * Base class for the planner canvas context menus. Concrete menus decide
 * their title and entries based on what was right-clicked (nothing, one
 * node, or a group of nodes).
 */
export abstract class PlannerContextMenu
{

	public getTitle(): string | null
	{
		return null;
	}

	public abstract getItems(): ContextMenuItem[];

}
