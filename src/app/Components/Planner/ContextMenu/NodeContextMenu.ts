import {faBan, faCheck, faCompress, faCrosshairs, faDiagramProject, faExpand, faFolderOpen, faLock, faLockOpen, faRotateLeft, faTrashCan, faXmark} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {NodeResizeOptions} from '@src/Components/Planner/ContextMenu/NodeResizeOptions';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
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
					// focusPanel, not openPanel: an already-open inspector hidden
					// behind another tab on its side must still come to the front.
					this.panelLayout.focusPanel('inspector');
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

		// "Done" marks the node as built in the game - any node type can be.
		items.push({
			label: this.node.done ? 'Mark as not done' : 'Mark as done',
			icon: this.node.done ? faRotateLeft : faCheck,
			action: () => this.actions.requestNodeDone({nodeIds: [this.node.id], done: !this.node.done}),
		});

		items.push(...this.requestItems());

		// Resize the node to the smallest/largest size its connected edges
		// imply; grayed when there is nothing to change.
		items.push(this.resizeItem('Minimise to edges', faCompress, this.resize.minimise));
		items.push(this.resizeItem('Maximise to edges', faExpand, this.resize.maximise));

		// Deleting a subplan node deletes the subplan from the plans tree too
		// (the planner confirms first).
		items.push({
			label: 'Delete node',
			icon: faTrashCan,
			action: () => this.actions.requestNodeDelete([this.node.id]),
		});

		return items;
	}

	/**
	 * Shortcuts editing the production request the node came from - what the
	 * matching calculator tab (Recipes, Machines, Byproducts, Power, Request,
	 * Resources, Input) would do; automatic mode then recalculates.
	 */
	private requestItems(): ContextMenuItem[]
	{
		const node = this.node;

		if (node instanceof RecipeNode) {
			return [
				{
					label: 'Disable recipe',
					icon: faBan,
					action: () => this.actions.requestRecipeDisable(node.recipe.className),
				},
				{
					label: `Disable machine (${node.machine.name})`,
					icon: faBan,
					action: () => this.actions.requestMachineDisable(node.machine.className),
				},
			];
		}

		if (node instanceof GeneratorNode) {
			return [
				{
					label: `Disable fuel (${node.fuel.item.name})`,
					icon: faBan,
					action: () => this.actions.requestFuelDisable({
						generatorClassName: node.generator.className,
						fuelItemClassName: node.fuel.item.className,
					}),
				},
				{
					label: 'Disable generator',
					icon: faBan,
					action: () => this.actions.requestGeneratorDisable(node.generator.className),
				},
			];
		}

		if (node instanceof ByproductNode) {
			return [{
				label: 'Disable byproduct',
				icon: faBan,
				action: () => this.actions.requestByproductDisable(node.item.className),
			}];
		}

		if (node instanceof ProductNode) {
			return [{
				label: 'Remove product',
				icon: faXmark,
				action: () => this.actions.requestProductRemove(node.item.className),
			}];
		}

		if (node instanceof MineNode) {
			return [{
				label: 'Disable resource',
				icon: faBan,
				action: () => this.actions.requestResourceDisable(node.item.className),
			}];
		}

		if (node instanceof InputNode) {
			return [{
				label: 'Remove input',
				icon: faXmark,
				action: () => this.actions.requestInputRemove(node.item.className),
			}];
		}

		return [];
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
