import {Injectable} from '@angular/core';
import {MachineBuilder} from '@src/Model/Planner/MachineBuilder';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';

/** Every row scales at its own clock and sloops and the rest is rebuilt, so a fractional factor stays buildable. */
@Injectable({providedIn: 'root'})
export class ProductionNodeScaler
{

	public constructor(private readonly builder: MachineBuilder)
	{
	}

	public scaled<T extends Node>(node: T, factor: number, settings: PlanSettings | null, id: string = node.id): T
	{
		if (!isFinite(factor) || factor <= 0 || (factor === 1 && id === node.id)) {
			return node;
		}
		if (node instanceof RecipeNode) {
			return this.scaledRecipe(node, factor, id) as unknown as T;
		}
		if (node instanceof GeneratorNode) {
			return this.placed(node, new GeneratorNode(id, node.amount * factor, node.generator, node.fuel, node.clockSpeed)) as unknown as T;
		}
		if (node instanceof MineNode) {
			return this.placed(node, new MineNode(id, node.amount * factor, node.item)) as unknown as T;
		}
		return node;
	}

	private scaledRecipe(node: RecipeNode, factor: number, id: string): RecipeNode
	{
		const target = node.target * factor;
		return this.placed(node, this.builder.node(id, target, this.builder.scaled(node.build, factor), node.machine, node.recipe));
	}

	private placed<T extends Node>(original: Node, scaled: T): T
	{
		scaled.x = original.x;
		scaled.y = original.y;
		scaled.locked = original.locked;
		scaled.done = original.done;
		return scaled;
	}

}
