import {Injectable} from '@angular/core';
import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {Recipe} from '@src/Model/Data/Entities/Recipe';

/**
 * The clock speed the active plan's Overclocking settings ask for. The solver
 * resolves the same precedence from its own request snapshot; everything that
 * builds machines outside a solve (the inspector's Calculate and Autofill,
 * node resizing, manually added nodes) asks here, so machines built by hand
 * come out clocked like the ones the calculation makes.
 */
@Injectable({providedIn: 'root'})
export class ClockSpeedResolver
{

	public constructor(private readonly planManager: PlanManager)
	{
	}

	/** Recipe override, else machine override, else the plan's default; 100% with no plan open. */
	public forRecipe(recipe: Recipe, machine: Building): number
	{
		return this.forRecipeIn(this.planManager.activeSettings(), recipe, machine);
	}

	/**
	 * The same precedence against given settings - for machines built for a
	 * plan that is not the open one (a subplan aggregated into its parent).
	 */
	public forRecipeIn(settings: PlanSettings | null, recipe: Recipe, machine: Building): number
	{
		if (!settings) {
			return 100;
		}
		const recipeClock = this.lastMatch(settings.recipeClockSpeeds, entry => entry.recipeClassName === recipe.className);
		const machineClock = this.lastMatch(settings.machineClockSpeeds, entry => entry.machineClassName === machine.className);
		return this.clamp(recipeClock ?? machineClock ?? settings.defaultClockSpeed);
	}

	/**
	 * The generator's own override; 100% otherwise. Generators are left out of
	 * the machine default on purpose - that one is about production machines.
	 */
	public forGenerator(generator: Building): number
	{
		if (!generator.canOverclock) {
			return 100;
		}
		const clock = this.lastMatch(
			this.planManager.activeSettings()?.generatorClockSpeeds,
			entry => entry.generatorClassName === generator.className,
		);
		return this.clamp(clock);
	}

	/** Duplicate rows are allowed in the settings - the last one wins, as in the solver. */
	private lastMatch<T extends {clockSpeed: number}>(entries: T[] | undefined, matches: (entry: T) => boolean): number | undefined
	{
		let found: number | undefined;
		(entries ?? []).forEach(entry => {
			if (matches(entry) && isFinite(entry.clockSpeed)) {
				found = entry.clockSpeed;
			}
		});
		return found;
	}

	private clamp(value: number | undefined): number
	{
		return value === undefined || !isFinite(value) ? 100 : Formulas.clampClock(value);
	}

}
