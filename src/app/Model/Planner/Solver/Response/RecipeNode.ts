import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export class RecipeNode extends Node
{

	public readonly type = 'recipe' as const;

	/**
	 * @param target Exact production rate in machine-equivalents at 100% clock -
	 *               the source of truth for all flows. The machine groups only
	 *               define capacity (>= target; clocks round up), so a machine
	 *               that micro-stalls waiting for input never overstates output.
	 */
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

	/** Machine-equivalents at 100% clock the groups can run. */
	public capacity(): number
	{
		return Formulas.groupCapacity(this.groups);
	}

	/**
	 * Whether machines with this capacity cannot reach the target. Near-exact
	 * by design: every generation path rounds clocks UP so capacity >= target,
	 * meaning anything beyond float noise is a real, user-made shortfall - a
	 * single machine clocked 0.0001% under the requirement already counts.
	 */
	public static isCapacityShort(target: number, capacity: number): boolean
	{
		return target - capacity > Math.max(1e-9, 1e-10 * capacity);
	}

	/** The node's own machines cannot reach its target. */
	public hasCapacityShortage(): boolean
	{
		return RecipeNode.isCapacityShort(this.target, this.capacity());
	}

	/** target / capacity; exceeds 1 when the built machines cannot reach the target (never clamped). */
	public utilization(): number
	{
		const capacity = this.capacity();
		return capacity > 0 ? this.target / capacity : 0;
	}

	/** Fraction of time the machines run - utilization capped at 100%, machines cannot duty-cycle beyond that. */
	public efficiency(): number
	{
		return Math.min(1, this.utilization());
	}

	/**
	 * Output boost from somersloops: boosted cycles per plain cycle, weighted
	 * by each group's share of the capacity. 1 when no sloops are slotted.
	 */
	public outputBoostRatio(): number
	{
		return Formulas.outputBoostRatio(this.machine, this.groups);
	}

	/** Average draw in MW: throttled machines duty-cycle, so scale by efficiency. */
	public averagePowerUsage(): number
	{
		const perClock = this.groups.reduce((sum, group) =>
			sum + group.machines * Formulas.machinePowerUsage(this.recipe, this.machine, group.clockSpeed, group.sloops), 0);
		return perClock * this.efficiency();
	}

	protected setupIO(): void
	{
		const referenceCycles = Formulas.referenceCycles(this.recipe, this.machine);
		const targetCycles = referenceCycles * this.target;

		// Sloop boost applies to outputs only, per machine group; with the node
		// throttled to its target, all machines slow down uniformly.
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
			x: this.x,
			y: this.y,
			...this.serializeLock(),
		};
	}

}
