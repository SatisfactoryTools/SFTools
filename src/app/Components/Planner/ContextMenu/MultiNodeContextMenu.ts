import {faCheck, faDiagramProject, faLock, faLockOpen, faRotateLeft, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/**
 * Context menu shown when right-clicking a multi-node selection.
 */
export class MultiNodeContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly nodes: Node[],
		private readonly actions: PlannerActionsService,
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return `${this.nodes.length} nodes`;
	}

	public getItems(): ContextMenuItem[]
	{
		const lockableIds = this.nodes.filter(node => node instanceof RecipeNode).map(node => node.id);
		// A mixed selection is unified to done first; only a fully done one clears.
		const allDone = this.nodes.every(node => node.done);
		return [
			{
				label: 'Convert to subplan',
				icon: faDiagramProject,
				// A subplan node references a plan whose parent is this plan -
				// nesting it under a new subplan would break that relationship.
				disabled: this.nodes.some(node => node instanceof SubplanNode),
				action: () => this.actions.requestSubplanConvert(this.nodes.map(node => node.id)),
			},
			{
				label: 'Lock all',
				icon: faLock,
				disabled: lockableIds.length === 0,
				action: () => this.actions.requestNodeLock({nodeIds: lockableIds, locked: true}),
			},
			{
				label: 'Unlock all',
				icon: faLockOpen,
				disabled: lockableIds.length === 0,
				action: () => this.actions.requestNodeLock({nodeIds: lockableIds, locked: false}),
			},
			{
				label: allDone ? 'Mark all as not done' : 'Mark all as done',
				icon: allDone ? faRotateLeft : faCheck,
				action: () => this.actions.requestNodeDone({nodeIds: this.nodes.map(node => node.id), done: !allDone}),
			},
			{
				label: `Delete ${this.nodes.length} nodes`,
				icon: faTrashCan,
				action: () => this.actions.requestNodeDelete(this.nodes.map(node => node.id)),
			},
		];
	}

}
