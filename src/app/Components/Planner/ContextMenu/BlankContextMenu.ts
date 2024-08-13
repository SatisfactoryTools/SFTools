import {faDiagramProject, faPlus} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';

/**
 * Context menu shown when right-clicking an empty spot on the canvas.
 */
export class BlankContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly position: GraphPoint,
	)
	{
		super();
	}

	public getItems(): ContextMenuItem[]
	{
		return [
			{
				label: 'Add node…',
				icon: faPlus,
				action: () => this.actions.requestNodeAdd(this.position),
			},
			{
				label: 'Create subplan',
				icon: faDiagramProject,
				action: () => this.actions.requestSubplanCreate(this.position),
			},
		];
	}

}
