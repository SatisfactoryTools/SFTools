import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export class RecipeNode extends Node
{

	public readonly type = 'recipe' as const;

	/** Like x/y/locked it is carried over to replacement instances, not constructed. */
	public groupingMode: GroupingMode = 'underclock-last';

	/** @param target Exact rate in machine-equivalents at 100% clock - the source of truth for all flows; the groups only define capacity (>= target, clocks round up). */
	public constructor(
		id: string,
		public readonly target: number,
		public readonly groups: MachineGroup[],
		public readonly machine: Building,
		public readonly recipe: Recipe,
	)
	{
		super(id, groups.reduce((sum, group) => sum + group.machines, 0));
		this.setupIO();
	}

	/** Machine-equivalents at 100% clock. */
	public capacity(): number
	{
		return Formulas.groupCapacity(this.groups);
	}

	/** Near-exact by design: every generation path rounds clocks UP, so anything beyond float noise is a real, user-made shortfall. */
	public static isCapacityShort(target: number, capacity: number): boolean
	{
		return target - capacity > Math.max(1e-9, 1e-10 * capacity);
	}

	public hasCapacityShortage(): boolean
	{
		return RecipeNode.isCapacityShort(this.target, this.capacity());
	}

	/** Exceeds 1 when the built machines cannot reach the target (never clamped). */
	public utilization(): number
	{
		const capacity = this.capacity();
		return capacity > 0 ? this.target / capacity : 0;
	}

	/** Fraction of time the machines run. */
	public efficiency(): number
	{
		return Math.min(1, this.utilization());
	}

	/** Boosted cycles per plain cycle, weighted by each group's share of the capacity; 1 without sloops. */
	public outputBoostRatio(): number
	{
		return Formulas.outputBoostRatio(this.machine, this.groups);
	}

	/** In MW. Throttled machines duty-cycle, so the whole band, peak included, scales by efficiency. */
	public powerDraw(): PowerDraw
	{
		const perClock = PowerDraw.sum(this.groups.map(group =>
			Formulas.machinePowerDraw(this.recipe, this.machine, group.clockSpeed, group.sloops).scale(group.machines)));
		return perClock.scale(this.efficiency());
	}

	/** In MW - the single figure the solver and the totals count. */
	public averagePowerUsage(): number
	{
		return this.powerDraw().average;
	}

	protected setupIO(): void
	{
		const referenceCycles = Formulas.referenceCycles(this.recipe, this.machine);
		const targetCycles = referenceCycles * this.target;

		// Sloop boost applies to outputs only, per machine group; with the node throttled to its target, all machines slow down uniformly.
		const boostedTargetCycles = targetCycles * Formulas.outputBoostRatio(this.machine, this.groups);

		this.recipe.ingredients.forEach(ingredient =>
			this.inputs.push(new NodeIO(ingredient.item, ingredient.amount * targetCycles)));
		this.recipe.products.forEach(product =>
			this.outputs.push(new NodeIO(product.item, product.amount * boostedTargetCycles)));
	}

	public getDisplayName(): string
	{
		return this.recipe.name;
	}

	public toJSON(): object
	{
		return {
			type: this.type,
			id: this.id,
			recipeClassName: this.recipe.className,
			machineClassName: this.machine.className,
			target: this.target,
			groups: this.groups,
			groupingMode: this.groupingMode,
			x: this.x,
			y: this.y,
			...this.serializeFlags(),
		};
	}

}
