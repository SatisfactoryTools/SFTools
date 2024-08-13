import {faCompress, faCrosshairs, faDiagramProject, faExpand, faFolderOpen, faLock, faLockOpen, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {NodeResizeOptions} from '@src/Components/Planner/ContextMenu/NodeResizeOptions';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/**
 * Context menu shown when right-clicking a single node.
 */
export class NodeContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly node: Node,
		private readonly resize: NodeResizeOptions,
		private readonly actions: PlannerActionsService,
		private readonly panelLayout: PanelLayoutService,
		private readonly plannerGraph: PlannerGraphService,
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return this.node.getDisplayName();
	}

	public getItems(): ContextMenuItem[]
	{
		const items: ContextMenuItem[] = [
			{
				label: 'Inspect node…',
				icon: faCrosshairs,
				action: () => {
					this.plannerGraph.selectNodeById(this.node.id);
					this.panelLayout.openPanel('inspector');
				},
			},
		];

		if (this.node instanceof SubplanNode) {
			const subplanId = this.node.subplanId;
			items.push({
				label: 'Open subplan',
				icon: faFolderOpen,
				action: () => this.actions.requestSubplanOpen(subplanId),
			});
		} else {
			items.push({
				label: 'Convert to subplan',
				icon: faDiagramProject,
				action: () => this.actions.requestSubplanConvert([this.node.id]),
			});
		}

		if (this.node instanceof RecipeNode) {
			items.push({
				label: this.node.locked ? 'Unlock node' : 'Lock node',
				icon: this.node.locked ? faLockOpen : faLock,
				action: () => this.actions.requestNodeLock({nodeIds: [this.node.id], locked: !this.node.locked}),
			});
		}

		// Resize the node to the smallest/largest size its connected edges
		// imply; grayed when there is nothing to change.
		items.push(this.resizeItem('Minimise to edges', faCompress, this.resize.minimise));
		items.push(this.resizeItem('Maximise to edges', faExpand, this.resize.maximise));

		// Deleting a subplan node only detaches it from this graph - the
		// subplan itself stays in the plans tree.
		items.push({
			label: 'Delete node',
			icon: faTrashCan,
			action: () => this.actions.requestNodeDelete([this.node.id]),
		});

		return items;
	}

	private resizeItem(label: string, icon: ContextMenuItem['icon'], replacement: Node | null): ContextMenuItem
	{
		return {
			label,
			icon,
			disabled: replacement === null,
			action: () => {
				if (replacement) {
					this.actions.requestNodeUpdate(replacement);
				}
			},
		};
	}

}
