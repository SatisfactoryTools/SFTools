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

/**
 * Resizes a single producing node: its production is multiplied by the
 * factor and a recipe node's machines are then arranged for the new target
 * per its own grouping mode, rather than its groups being multiplied one by
 * one. Tripling 2 machines @100% + 1 @50% gives 7 @100% + 1 @50%, not
 * 6 @100% + 3 @50% - and a fractional factor (×2.5) stays buildable at all.
 *
 * The machines are rebuilt at the clock the OWNING plan's Overclocking
 * settings ask for this recipe (the caller passes them - it may well not be
 * the open plan), and a node already built faster than that keeps its clock,
 * so a hand-overclocked node is not quietly clocked back down. Sloop buckets
 * keep their share of the capacity, so the node's boost - and its
 * input/output ratio - survives the resizing.
 */
@Injectable({providedIn: 'root'})
export class ProductionNodeScaler
{

	public constructor(
		private readonly normalizer: MachineGroupNormalizer,
		private readonly clocks: ClockSpeedResolver,
	)
	{
	}

	/**
	 * The node as it is built `factor` times over; the node itself at factor 1
	 * (or an unusable one). `settings` are those of the plan the node lives in.
	 * Pass `id` to get a separate copy instead of a replacement - that is what
	 * splitting one node into several needs.
	 */
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
	 * The clock to build the scaled machines at: what the plan's Overclocking
	 * settings ask for this recipe, raised to the node's fastest group when
	 * that one runs faster. Anything at or below the plan's clock is read as
	 * ordinary machines plus an underclocked remainder (a node whose only
	 * group is that remainder must not scale at the remainder's clock), while
	 * a node built above it was deliberately overclocked and stays that way.
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
