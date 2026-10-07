import {faCheck, faDiagramProject, faLock, faLockOpen, faRotateLeft, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

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
		const lockable = this.nodes.filter(node => node.canToggleLock());
		const lockableIds = lockable.map(node => node.id);
		// A mixed selection is unified to done first; only a fully done one clears.
		const allDone = this.nodes.every(node => node.done);
		// Both rows stay, but the lock hotkey toggles: it unlocks a selection locked throughout and locks anything else.
		const allLocked = lockable.length > 0 && lockable.every(node => node.locked);
		return [
			{
				label: 'Convert to subplan',
				icon: faDiagramProject,
				hotkey: 'graph.convertToSubplan',
				// A subplan node's plan has this plan as parent - nesting it under a new subplan would break that.
				disabled: this.nodes.some(node => node instanceof SubplanNode),
				action: () => this.actions.requestSubplanConvert(this.nodes.map(node => node.id)),
			},
			{
				label: 'Lock all',
				icon: faLock,
				hotkey: allLocked ? undefined : 'graph.toggleLock',
				disabled: lockableIds.length === 0,
				action: () => this.actions.requestNodeLock({nodeIds: lockableIds, locked: true}),
			},
			{
				label: 'Unlock all',
				icon: faLockOpen,
				hotkey: allLocked ? 'graph.toggleLock' : undefined,
				disabled: lockableIds.length === 0,
				action: () => this.actions.requestNodeLock({nodeIds: lockableIds, locked: false}),
			},
			{
				label: allDone ? 'Mark all as not done' : 'Mark all as done',
				hotkey: 'graph.toggleDone',
				icon: allDone ? faRotateLeft : faCheck,
				action: () => this.actions.requestNodeDone({nodeIds: this.nodes.map(node => node.id), done: !allDone}),
			},
			{
				label: `Delete ${this.nodes.length} nodes`,
				icon: faTrashCan,
				hotkey: 'graph.deleteNode',
				action: () => this.actions.requestNodeDelete(this.nodes.map(node => node.id)),
			},
		];
	}

}
