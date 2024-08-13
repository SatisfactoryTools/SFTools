import {faCompress, faExpand, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {EdgeAmountAction} from '@src/Components/Planner/ContextMenu/EdgeAmountAction';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';

/**
 * Context menu shown when right-clicking an edge. The title (item name and
 * rate) and the minimise/maximise targets are resolved by the caller - this
 * class has no access to version data; a null action renders grayed out.
 */
export class EdgeContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly edge: GraphEdge,
		private readonly title: string,
		private readonly minimise: EdgeAmountAction | null,
		private readonly maximise: EdgeAmountAction | null,
		private readonly actions: PlannerActionsService,
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
			this.amountItem('Minimise', faCompress, this.minimise),
			this.amountItem('Maximise', faExpand, this.maximise),
			{
				label: 'Delete edge',
				icon: faTrashCan,
				action: () => this.actions.requestEdgeDelete(this.edge),
			},
		];
	}

	private amountItem(fallbackLabel: string, icon: ContextMenuItem['icon'], action: EdgeAmountAction | null): ContextMenuItem
	{
		return {
			label: action?.label ?? fallbackLabel,
			icon,
			disabled: action === null,
			action: () => {
				if (action) {
					this.actions.requestEdgeAmount({edge: this.edge, amount: action.amount});
				}
			},
		};
	}

}
