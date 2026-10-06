import {ExtraPower} from '@src/Model/Planner/ExtraPower';
import {GeneratorFuelOption} from '@src/Model/Planner/Solver/Request/GeneratorFuelOption';
import {InputSource} from '@src/Model/Planner/Solver/Request/InputSource';
import {Item} from '@src/Model/Data/Entities/Item';
import {MaximiseTarget} from '@src/Model/Planner/Solver/Request/MaximiseTarget';
import {OptimisationTarget} from '@src/Model/Planner/Solver/Request/OptimisationTarget';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {ProductionTarget} from '@src/Model/Planner/Solver/Request/ProductionTarget';

export interface SolverRequest
{

	optimisation: OptimisationTarget;
	productions: ProductionTarget[];
	maximise: MaximiseTarget | null;
	/** Kept separate from `inputs` so the final graph can net them against the byproducts that created them. */
	carryInputs: InputSource[];
	recipes: Recipe[];
	inputs: InputSource[];
	maxSloops: number;
	defaultClockSpeed: number;
	recipeClockSpeeds: Record<string, number>;
	machineClockSpeeds: Record<string, number>;
	generatorClockSpeeds: Record<string, number>;
	resourceLimits: Record<string, number>;
	generators: GeneratorFuelOption[];
	extraPower: ExtraPower;
	powerDemand: number;
	producePowerForFactory: boolean;
	excessPowerFraction: number;
	disabledByproducts: string[];
	sinkableItems: Item[];
	sinkPointsDemand: number;

}
