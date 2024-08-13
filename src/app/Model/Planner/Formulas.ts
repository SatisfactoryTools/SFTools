import {Building} from '@src/Model/Data/Entities/Building';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';
import {Item} from '@src/Model/Data/Entities/Item';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';

/**
 * THE single home of the game's math - clocking, power draw, somersloop
 * boosts, generator fuel rates, power shards and sink points. Every node,
 * panel and the solver's LP derive their numbers from here, so a game update
 * changing a rule is a change in exactly one place.
 */
export class Formulas
{

	/**
	 * Percent of overclock covered by one power shard: 100.0001–150% is one
	 * shard, 150.0001–200% two, and so on, per machine. The game data carries
	 * no usable clockChangePerShard, so the game rule is fixed here.
	 */
	public static readonly CLOCK_PER_SHARD = 50;

	/** Recipe cycles per minute of ONE machine at 100% clock. */
	public static referenceCycles(recipe: Recipe, machine: Building): number
	{
		return (60 / recipe.time) * machine.manufacturingSpeed;
	}

	/** Somersloop output multiplier of one machine (1 without sloops). */
	public static sloopOutputMultiplier(machine: Building, sloops: number): number
	{
		return 1 + machine.sloopBoost * sloops;
	}

	/** Machine-equivalents at 100% clock the machine groups can run. */
	public static groupCapacity(groups: MachineGroup[]): number
	{
		return groups.reduce((sum, group) => sum + group.machines * (group.clockSpeed / 100), 0);
	}

	/**
	 * Output boost from somersloops: boosted cycles per plain cycle, weighted
	 * by each group's share of the capacity. 1 when no sloops are slotted.
	 */
	public static outputBoostRatio(machine: Building, groups: MachineGroup[]): number
	{
		let capacityCycles = 0;
		let boostedCycles = 0;
		groups.forEach(group => {
			const groupCycles = group.machines * (group.clockSpeed / 100);
			capacityCycles += groupCycles;
			boostedCycles += groupCycles * Formulas.sloopOutputMultiplier(machine, group.sloops);
		});
		return capacityCycles > 0 ? boostedCycles / capacityCycles : 1;
	}

	/**
	 * Per-machine draw in MW at 100% clock with no sloops. Variable-draw
	 * recipes (particle accelerators etc.) carry their own oscillating
	 * consumption - their machine reports powerUsage 0 - and count as the
	 * oscillation's average.
	 */
	public static basePowerUsage(recipe: Recipe, machine: Building): number
	{
		return recipe.variablePowerDraw
			? recipe.variablePowerDrawConstant + recipe.variablePowerDrawFactor / 2
			: machine.powerUsage;
	}

	/**
	 * Draw in MW of ONE machine at the given clock speed and sloop count:
	 * clocking scales by the machine's power exponent, somersloops square
	 * their output multiplier (a fully slooped machine draws 4× at 2× output).
	 */
	public static machinePowerUsage(recipe: Recipe, machine: Building, clockSpeed: number, sloops: number): number
	{
		return Formulas.basePowerUsage(recipe, machine)
			* Math.pow(clockSpeed / 100, machine.powerUsageExponent)
			* Math.pow(Formulas.sloopOutputMultiplier(machine, sloops), 2);
	}

	/** Clamps a clock speed to the game's 1–250% range at 4-decimal precision. */
	public static clampClock(value: number): number
	{
		return Math.min(250, Math.max(1, Math.round(value * 10000) / 10000));
	}

	/** Whole power shards ONE machine needs to run at the given clock speed. */
	public static powerShards(clockSpeed: number): number
	{
		if (clockSpeed <= 100 + 1e-9) {
			return 0;
		}
		return Math.ceil((clockSpeed - 100) / Formulas.CLOCK_PER_SHARD - 1e-9);
	}

	/** Fuel items (m³ for fluids) burned per minute by ONE generator. */
	public static generatorBurnRate(generator: Building, fuel: Fuel): number
	{
		return generator.powerProduction * 60 / fuel.item.energy;
	}

	/** Supplemental fluid m³ per minute for ONE generator. */
	public static generatorSupplementalRate(generator: Building): number
	{
		return generator.powerProduction * generator.supplementalToPowerRatio * 0.06;
	}

	/** MW produced by the given (fractional) number of generators. */
	public static generatorPowerProduction(generator: Building, count: number): number
	{
		return generator.powerProduction * count;
	}

	/** Sink points per minute for sinking the item at the given rate. */
	public static sinkPoints(item: Item, ratePerMinute: number): number
	{
		return item.sinkPoints * ratePerMinute;
	}

}
