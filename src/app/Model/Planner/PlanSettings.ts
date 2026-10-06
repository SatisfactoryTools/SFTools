import {AlienPowerAugmenters} from '@src/Model/Planner/AlienPowerAugmenters';
import {CalculationMode} from '@src/Model/Planner/CalculationMode';
import {GraphLayoutSettings} from '@src/Model/Planner/GraphLayoutSettings';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {GeneratorClockSpeed} from '@src/Model/Planner/GeneratorClockSpeed';
import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';
import {MachineClockSpeed} from '@src/Model/Planner/MachineClockSpeed';
import {OptimisationSettings} from '@src/Model/Planner/OptimisationSettings';
import {RecipeClockSpeed} from '@src/Model/Planner/RecipeClockSpeed';
import {ResourceWeightMode} from '@src/Model/Planner/ResourceWeightMode';
import {SloopAccuracy} from '@src/Model/Planner/SloopAccuracy';

export interface PlanSettings
{
	readonly calculationMode: CalculationMode;
	readonly graph?: GraphLayoutSettings;
	readonly enabledRecipes?: string[];
	readonly disabledMachines?: string[];
	readonly resourceLimits?: Record<string, number>;
	readonly disabledResources?: string[];
	readonly resourceWeightMode?: ResourceWeightMode;
	readonly resourceWeights?: Record<string, number>;
	readonly enabledFuels?: Record<string, string[]>;
	readonly geothermalGenerators?: GeothermalGenerators;
	readonly alienPowerAugmenters?: AlienPowerAugmenters;
	readonly disabledByproducts?: string[];
	readonly sinkableItems?: string[];
	readonly producePowerForFactory?: boolean;
	readonly excessPowerPercent?: number;
	readonly optimisation?: OptimisationSettings;
	readonly defaultGroupingMode?: GroupingMode;
	readonly defaultClockSpeed?: number;
	readonly recipeClockSpeeds?: RecipeClockSpeed[];
	readonly machineClockSpeeds?: MachineClockSpeed[];
	/** Generators burn fuel in step with their clock, so this only trades buildings for power shards. */
	readonly generatorClockSpeeds?: GeneratorClockSpeed[];
	readonly maxSloops?: number;
	readonly sloopAccuracy?: SloopAccuracy;
}
