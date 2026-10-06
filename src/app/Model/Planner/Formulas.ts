import {Building} from '@src/Model/Data/Entities/Building';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';
import {Item} from '@src/Model/Data/Entities/Item';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';

export class Formulas
{

	/** One shard per 50% over 100%; the game data carries no usable clockChangePerShard, so the rule is fixed here. */
	public static readonly CLOCK_PER_SHARD = 50;

	public static referenceCycles(recipe: Recipe, machine: Building): number
	{
		return (60 / recipe.time) * machine.manufacturingSpeed;
	}

	public static sloopOutputMultiplier(machine: Building, sloops: number): number
	{
		return 1 + machine.sloopBoost * sloops;
	}

	public static groupCapacity(groups: MachineGroup[]): number
	{
		return groups.reduce((sum, group) => sum + group.machines * (group.clockSpeed / 100), 0);
	}

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

	/** The game honours variable power only in variable-power machines; the data has no flag, but exactly those report powerUsage 0 (a Blender keeps its 75 MW even for Biochemical Sculptor). */
	public static usesVariablePower(recipe: Recipe, machine: Building): boolean
	{
		return recipe.variablePowerDraw && machine.powerUsage === 0;
	}

	public static variablePowerBand(recipe: Recipe): PowerDraw
	{
		return PowerDraw.between(
			recipe.variablePowerDrawConstant,
			recipe.variablePowerDrawConstant + recipe.variablePowerDrawFactor,
		);
	}

	public static basePowerDraw(recipe: Recipe, machine: Building): PowerDraw
	{
		return Formulas.usesVariablePower(recipe, machine)
			? Formulas.variablePowerBand(recipe)
			: PowerDraw.fixed(machine.powerUsage);
	}

	/** Somersloops square their output multiplier: a fully slooped machine draws 4x at 2x output. */
	public static machinePowerDraw(recipe: Recipe, machine: Building, clockSpeed: number, sloops: number): PowerDraw
	{
		return Formulas.basePowerDraw(recipe, machine).scale(
			Math.pow(clockSpeed / 100, machine.powerUsageExponent)
			* Math.pow(Formulas.sloopOutputMultiplier(machine, sloops), 2),
		);
	}

	public static machinePowerUsage(recipe: Recipe, machine: Building, clockSpeed: number, sloops: number): number
	{
		return Formulas.machinePowerDraw(recipe, machine, clockSpeed, sloops).average;
	}

	public static clampClock(value: number): number
	{
		return Math.min(250, Math.max(1, Math.round(value * 10000) / 10000));
	}

	public static powerShards(clockSpeed: number): number
	{
		if (clockSpeed <= 100 + 1e-9) {
			return 0;
		}
		return Math.ceil((clockSpeed - 100) / Formulas.CLOCK_PER_SHARD - 1e-9);
	}

	public static generatorBurnRate(generator: Building, fuel: Fuel, clockSpeed: number = 100): number
	{
		return generator.powerProduction * 60 / fuel.item.energy * (clockSpeed / 100);
	}

	public static generatorSupplementalRate(generator: Building, clockSpeed: number = 100): number
	{
		return generator.powerProduction * generator.supplementalToPowerRatio * 0.06 * (clockSpeed / 100);
	}

	public static generatorPowerProduction(generator: Building, count: number, clockSpeed: number = 100): number
	{
		return generator.powerProduction * count * (clockSpeed / 100);
	}

	public static sinkPoints(item: Item, ratePerMinute: number): number
	{
		return item.sinkPoints * ratePerMinute;
	}

}
