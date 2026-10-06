import {Injectable} from '@angular/core';
import {ClockSpeedResolver} from '@src/Model/Planner/ClockSpeedResolver';
import {Formulas} from '@src/Model/Planner/Formulas';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';

/** Machines are re-arranged for the new target rather than multiplied group by group, so a fractional factor stays buildable. */
@Injectable({providedIn: 'root'})
export class ProductionNodeScaler
{

	public constructor(
		private readonly normalizer: MachineGroupNormalizer,
		private readonly clocks: ClockSpeedResolver,
	)
	{
	}

	public scaled<T extends Node>(node: T, factor: number, settings: PlanSettings | null, id: string = node.id): T
	{
		if (!isFinite(factor) || factor <= 0 || (factor === 1 && id === node.id)) {
			return node;
		}
		if (node instanceof RecipeNode) {
			return this.scaledRecipe(node, factor, settings, id) as unknown as T;
		}
		if (node instanceof GeneratorNode) {
			return this.placed(node, new GeneratorNode(id, node.amount * factor, node.generator, node.fuel, node.clockSpeed)) as unknown as T;
		}
		if (node instanceof MineNode) {
			return this.placed(node, new MineNode(id, node.amount * factor, node.item)) as unknown as T;
		}
		return node;
	}

	private scaledRecipe(node: RecipeNode, factor: number, settings: PlanSettings | null, id: string): RecipeNode
	{
		const target = node.target * factor;
		const groups = this.normalizer.recalculated(node.groups, target, node.groupingMode, this.buildClockOf(node, settings));
		const scaled = new RecipeNode(id, target, groups, node.machine, node.recipe);
		scaled.groupingMode = node.groupingMode;
		return this.placed(node, scaled);
	}

	/**
	 * Groups at or below the plan's clock are an underclocked remainder (a node whose only group
	 * is that remainder must not scale at its clock); a group above it was deliberately overclocked and stays.
	 */
	private buildClockOf(node: RecipeNode, settings: PlanSettings | null): number
	{
		const planClock = this.clocks.forRecipeIn(settings, node.recipe, node.machine);
		const fastest = node.groups.reduce((max: number, group: MachineGroup) => Math.max(max, group.clockSpeed), 0);
		return Formulas.clampClock(Math.max(planClock, fastest));
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
