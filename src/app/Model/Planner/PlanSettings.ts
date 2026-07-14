import {CalculationMode} from '@src/Model/Planner/CalculationMode';
import {GraphLayoutSettings} from '@src/Model/Planner/GraphLayoutSettings';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {OptimisationSettings} from '@src/Model/Planner/OptimisationSettings';
import {RecipeClockSpeed} from '@src/Model/Planner/RecipeClockSpeed';
import {SloopAccuracy} from '@src/Model/Planner/SloopAccuracy';

export interface PlanSettings
{
	readonly calculationMode: CalculationMode;
	/** Absent on plans saved before layout settings existed - resolve via GraphLayoutDefaults. */
	readonly graph?: GraphLayoutSettings;
	/**
	 * Recipe class names the solver may use. Absent = default selection
	 * (every non-alternate machine recipe) - resolve via EnabledRecipesResolver.
	 */
	readonly enabledRecipes?: string[];
	/**
	 * Machine class names the solver may not use - recipes producible only in
	 * disabled machines are excluded regardless of the enabled-recipes
	 * selection. Absent = every machine available.
	 */
	readonly disabledMachines?: string[];
	/**
	 * Per-minute mining caps by raw resource class name. An absent entry (or
	 * absent map) means the resource is unlimited.
	 */
	readonly resourceLimits?: Record<string, number>;
	/**
	 * Generator fuels the solver may burn, keyed by generator class name with
	 * the enabled fuel item classes as values. Absent = no generators.
	 */
	readonly enabledFuels?: Record<string, string[]>;
	/**
	 * Item class names the solver may feed into the AWESOME Sink to earn sink
	 * points. Absent = nothing may be sinked.
	 */
	readonly sinkableItems?: string[];
	/**
	 * The solver also generates the power the factory's own machines draw
	 * (including the fuel chain feeding the generators). Absent = off.
	 */
	readonly producePowerForFactory?: boolean;
	/**
	 * Extra generation margin in percent on top of the factory draw - a
	 * safety net for miners, pumps and variable-draw swings. Absent = 10.
	 */
	readonly excessPowerPercent?: number;
	/** Solver optimisation goals and weights; absent = defaults (resources + power). */
	readonly optimisation?: OptimisationSettings;
	/**
	 * Machine-group arrangement every newly added recipe node starts with -
	 * manual adds and solver-built nodes alike. Absent = underclock-last.
	 */
	readonly defaultGroupingMode?: GroupingMode;
	/** Clock speed in percent for solver-built machines. Absent = 100. */
	readonly defaultClockSpeed?: number;
	/** Per-recipe clock-speed overrides; recipes not listed run at the default. */
	readonly recipeClockSpeeds?: RecipeClockSpeed[];
	/** Somersloops the solver may slot into machines. Absent = none. */
	readonly maxSloops?: number;
	/** Solve accuracy when somersloops are available (MIP gap). Absent = low. */
	readonly sloopAccuracy?: SloopAccuracy;
}
