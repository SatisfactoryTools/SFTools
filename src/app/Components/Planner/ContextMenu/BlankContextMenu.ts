import {faDiagramProject, faPlus} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';

export class BlankContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly position: GraphPoint,
		private readonly hasPlan: boolean,
	)
	{
		super();
	}

	public getItems(): ContextMenuItem[]
	{
		const items: ContextMenuItem[] = [
			{
				label: 'Add node…',
				icon: faPlus,
				hotkey: 'graph.addNode',
				action: () => this.actions.requestNodeAdd(this.position),
			},
		];
		if (this.hasPlan) {
			items.push({
				label: 'Create subplan',
				icon: faDiagramProject,
				hotkey: 'graph.createSubplan',
				action: () => this.actions.requestSubplanCreate(this.position),
			});
		}
		return items;
	}

}
