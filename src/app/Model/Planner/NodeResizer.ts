import {Injectable} from '@angular/core';
import {ClockSpeedResolver} from '@src/Model/Planner/ClockSpeedResolver';
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

/** Resizing is a manual edit, so replacements come back locked - except withAmount, which serves elastic bookkeeping. */
@Injectable({providedIn: 'root'})
export class NodeResizer
{

	public constructor(
		private readonly normalizer: MachineGroupNormalizer,
		private readonly clocks: ClockSpeedResolver,
	)
	{
	}

	public isResizable(node: Node): boolean
	{
		return node instanceof RecipeNode || node instanceof GeneratorNode || node instanceof ItemAmountNode;
	}

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
			const perMachine = Formulas.generatorBurnRate(node.generator, node.fuel, node.clockSpeed) * node.fuel.byproductAmount;
			if (perMachine <= 0) {
				return null;
			}
			return this.placed(node, new GeneratorNode(node.id, (this.outputTotal(node, itemClassName) + addition) / perMachine, node.generator, node.fuel, node.clockSpeed), true);
		}
		// Only the producing item nodes qualify - their amount IS the output rate.
		if ((node instanceof InputNode || node instanceof MineNode) && node.item.className === itemClassName) {
			return this.replacedItemNode(node, node.amount + addition, true);
		}
		return null;
	}

	public scaled(node: Node, factor: number): Node | null
	{
		if (factor <= 0) {
			return null;
		}
		if (node instanceof RecipeNode) {
			return this.rebuiltRecipe(node, node.target * factor, this.uniformSloops(node.groups));
		}
		if (node instanceof GeneratorNode) {
			return this.placed(node, new GeneratorNode(node.id, node.amount * factor, node.generator, node.fuel, node.clockSpeed), true);
		}
		if (node instanceof ItemAmountNode) {
			return this.replacedItemNode(node, node.amount * factor, true);
		}
		return null;
	}

	/** Elastic bookkeeping, not a user edit: keeps the lock state. */
	public withAmount(node: ItemAmountNode, amount: number): ItemAmountNode
	{
		return this.replacedItemNode(node, amount, node.locked);
	}

	/** Recipes are left to their own editor. Pass another `id` for a separate copy, which node splitting needs. */
	public withSize(node: Node, size: number, id: string = node.id): Node | null
	{
		if (size <= 0) {
			return null;
		}
		if (node instanceof GeneratorNode) {
			return this.placed(node, new GeneratorNode(id, size, node.generator, node.fuel, node.clockSpeed), true);
		}
		if (node instanceof ItemAmountNode) {
			return this.replacedItemNode(node, size, true, id);
		}
		return null;
	}

	public withGenerator(node: GeneratorNode, amount: number, clockSpeed: number): GeneratorNode | null
	{
		if (amount <= 0 || clockSpeed <= 0) {
			return null;
		}
		return this.placed(node, new GeneratorNode(node.id, amount, node.generator, node.fuel, clockSpeed), true);
	}

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
		const groups = this.normalizer.generateForTarget(target, this.clocks.forRecipe(node.recipe, node.machine), sloops, node.groupingMode);
		const replacement = new RecipeNode(node.id, target, groups, node.machine, node.recipe);
		replacement.groupingMode = node.groupingMode;
		return this.placed(node, replacement, true);
	}

	/** Mixed sloops reset to 0: a scaled node then keeps its target exactly but its boosted output only approximately. */
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

	private replacedItemNode(node: ItemAmountNode, amount: number, locked: boolean, id: string = node.id): ItemAmountNode
	{
		let replacement: ItemAmountNode;
		if (node instanceof InputNode) {
			replacement = new InputNode(id, amount, node.item);
		} else if (node instanceof MineNode) {
			replacement = new MineNode(id, amount, node.item);
		} else if (node instanceof ProductNode) {
			replacement = new ProductNode(id, amount, node.item);
		} else if (node instanceof ByproductNode) {
			replacement = new ByproductNode(id, amount, node.item);
		} else {
			replacement = new SinkNode(id, amount, node.item);
		}
		return this.placed(node, replacement, locked);
	}

	private placed<T extends Node>(original: Node, replacement: T, locked: boolean): T
	{
		replacement.x = original.x;
		replacement.y = original.y;
		replacement.locked = locked;
		// Resizing a built node does not un-build it - the done marker stays.
		replacement.done = original.done;
		return replacement;
	}

}
