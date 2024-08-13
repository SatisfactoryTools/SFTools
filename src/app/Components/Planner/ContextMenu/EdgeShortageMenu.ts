import {faArrowUp, faCheck} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';

/**
 * Decision dropdown shown when a drawn connection asks for more than the
 * source has free: grow the source to cover the edge, or keep it as is and
 * connect only the free amount. Dismissing the menu creates no edge at all.
 */
export class EdgeShortageMenu extends PlannerContextMenu
{

	public constructor(
		private readonly title: string,
		private readonly increaseLabel: string,
		private readonly keepLabel: string,
		private readonly onIncrease: () => void,
		private readonly onKeep: () => void,
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
		return [
			{label: this.increaseLabel, icon: faArrowUp, action: this.onIncrease},
			{label: this.keepLabel, icon: faCheck, action: this.onKeep},
		];
	}

}
