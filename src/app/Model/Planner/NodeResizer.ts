import {Injectable} from '@angular/core';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SinkNode} from '@src/Model/Planner/Solver/Response/SinkNode';

/**
 * Builds resized replacements of graph nodes for the manual-editing assists:
 * "increase this node's output to cover a new edge" and the node
 * minimise/maximise actions. A node's size is its single scalar - the recipe
 * target, the generator machine count, or the item node rate. Replacements
 * keep the node's id and position; resizing is a manual edit, so they come
 * back locked (except withAmount, which serves elastic bookkeeping).
 */
@Injectable({providedIn: 'root'})
export class NodeResizer
{

	public constructor(private readonly normalizer: MachineGroupNormalizer)
	{
	}

	/** Nodes whose size this class can change; subplans and unknown types cannot. */
	public isResizable(node: Node): boolean
	{
		return node instanceof RecipeNode || node instanceof GeneratorNode || node instanceof ItemAmountNode;
	}

	/**
	 * Replacement producing `addition` more of the item than the node's
	 * current configuration; null when it cannot (not resizable, or the node
	 * does not produce the item).
	 */
	public increasedOutput(node: Node, itemClassName: string, addition: number): Node | null
	{
		if (node instanceof RecipeNode) {
			const sloops = this.uniformSloops(node.groups);
			const product = node.recipe.products.find(entry => entry.item.className === itemClassName);
			const perTarget = (product?.amount ?? 0)
				* Formulas.referenceCycles(node.recipe, node.machine)
				* Formulas.sloopOutputMultiplier(node.machine, sloops);
			if (perTarget <= 0) {
				return null;
			}
			return this.rebuiltRecipe(node, (this.outputTotal(node, itemClassName) + addition) / perTarget, sloops);
		}
		if (node instanceof GeneratorNode) {
			if (node.fuel.byproduct?.className !== itemClassName) {
				return null;
			}
			const perMachine = Formulas.generatorBurnRate(node.generator, node.fuel) * node.fuel.byproductAmount;
			if (perMachine <= 0) {
				return null;
			}
			return this.placed(node, new GeneratorNode(node.id, (this.outputTotal(node, itemClassName) + addition) / perMachine, node.generator, node.fuel), true);
		}
		// Only the producing item nodes qualify - their amount IS the output rate.
		if ((node instanceof InputNode || node instanceof MineNode) && node.item.className === itemClassName) {
			return this.replacedItemNode(node, node.amount + addition, true);
		}
		return null;
	}

	/**
	 * Replacement scaled to `factor` times the node's current size. For
	 * recipes the machine groups are regenerated at 100% clock (uniform
	 * sloops kept, mixed ones reset to 0 - matching the inspector's "Auto"),
	 * so mixed-sloop nodes scale their target exactly but their boosted
	 * output only approximately.
	 */
	public scaled(node: Node, factor: number): Node | null
	{
		if (factor <= 0) {
			return null;
		}
		if (node instanceof RecipeNode) {
			return this.rebuiltRecipe(node, node.target * factor, this.uniformSloops(node.groups));
		}
		if (node instanceof GeneratorNode) {
			return this.placed(node, new GeneratorNode(node.id, node.amount * factor, node.generator, node.fuel), true);
		}
		if (node instanceof ItemAmountNode) {
			return this.replacedItemNode(node, node.amount * factor, true);
		}
		return null;
	}

	/** Same item node at a new rate, keeping its lock state - elastic bookkeeping, not a user edit. */
	public withAmount(node: ItemAmountNode, amount: number): ItemAmountNode
	{
		return this.replacedItemNode(node, amount, node.locked);
	}

	/**
	 * Replacement at an absolute size - the item rate or the generator
	 * machine count. A user edit, so it comes back locked. Null for recipes
	 * (their own editor handles them) and subplans.
	 */
	public withSize(node: Node, size: number): Node | null
	{
		if (size <= 0) {
			return null;
		}
		if (node instanceof GeneratorNode) {
			return this.placed(node, new GeneratorNode(node.id, size, node.generator, node.fuel), true);
		}
		if (node instanceof ItemAmountNode) {
			return this.replacedItemNode(node, size, true);
		}
		return null;
	}

	/**
	 * Utilization ratios the node's connected edges imply: carried flow ÷
	 * configured flow, one entry per item that has at least one edge (both
	 * sides). min(ratios) is the smallest size the edges support, max(ratios)
	 * the largest - the node minimise/maximise targets.
	 */
	public edgeRatios(node: Node, edges: GraphEdge[]): number[]
	{
		const ratios: number[] = [];
		this.collectRatios(node.outputs, edges.filter(edge => edge.sourceId === node.id), ratios);
		this.collectRatios(node.inputs, edges.filter(edge => edge.targetId === node.id), ratios);
		return ratios;
	}

	private collectRatios(ios: NodeIO[], nodeEdges: GraphEdge[], ratios: number[]): void
	{
		const configured = new Map<string, number>();
		ios.forEach(io => configured.set(io.item.className, (configured.get(io.item.className) ?? 0) + io.maxAmount));

		const connected = new Map<string, number>();
		nodeEdges.forEach(edge => connected.set(edge.itemClassName, (connected.get(edge.itemClassName) ?? 0) + edge.amount));

		connected.forEach((flow, itemClassName) => {
			const config = configured.get(itemClassName) ?? 0;
			if (config > 1e-9) {
				ratios.push(flow / config);
			}
		});
	}

	private rebuiltRecipe(node: RecipeNode, target: number, sloops: number): RecipeNode | null
	{
		if (target <= 0) {
			return null;
		}
		return this.placed(node, new RecipeNode(node.id, target, this.normalizer.fromFractionalAmount(target, 100, sloops), node.machine, node.recipe), true);
	}

	/** The shared sloop count when all groups agree; 0 otherwise (mirrors the inspector's Auto regeneration). */
	private uniformSloops(groups: MachineGroup[]): number
	{
		if (groups.length === 0) {
			return 0;
		}
		return groups.every(group => group.sloops === groups[0].sloops) ? groups[0].sloops : 0;
	}

	private outputTotal(node: Node, itemClassName: string): number
	{
		return node.outputs
			.filter(io => io.item.className === itemClassName)
			.reduce((sum, io) => sum + io.maxAmount, 0);
	}

	private replacedItemNode(node: ItemAmountNode, amount: number, locked: boolean): ItemAmountNode
	{
		let replacement: ItemAmountNode;
		if (node instanceof InputNode) {
			replacement = new InputNode(node.id, amount, node.item);
		} else if (node instanceof MineNode) {
			replacement = new MineNode(node.id, amount, node.item);
		} else if (node instanceof ProductNode) {
			replacement = new ProductNode(node.id, amount, node.item);
		} else if (node instanceof ByproductNode) {
			replacement = new ByproductNode(node.id, amount, node.item);
		} else {
			replacement = new SinkNode(node.id, amount, node.item);
		}
		return this.placed(node, replacement, locked);
	}

	private placed<T extends Node>(original: Node, replacement: T, locked: boolean): T
	{
		replacement.x = original.x;
		replacement.y = original.y;
		replacement.locked = locked;
		return replacement;
	}

}
