import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';

export abstract class PlannerContextMenu
{

	public getTitle(): string | null
	{
		return null;
	}

	public abstract getItems(): ContextMenuItem[];

}
