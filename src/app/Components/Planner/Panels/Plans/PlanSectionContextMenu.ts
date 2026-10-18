import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';

export class PlanSectionContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly title: string,
		private readonly items: ContextMenuItem[],
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return this.title;
	}

	public getItems(): ContextMenuItem[]
	{
		return this.items;
	}

}
