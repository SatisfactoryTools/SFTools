import {GeneratorFuelOption} from '@src/Model/Planner/Solver/Request/GeneratorFuelOption';
import {InputSource} from '@src/Model/Planner/Solver/Request/InputSource';
import {Item} from '@src/Model/Data/Entities/Item';
import {OptimisationTarget} from '@src/Model/Planner/Solver/Request/OptimisationTarget';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {ProductionTarget} from '@src/Model/Planner/Solver/Request/ProductionTarget';

export interface SolverRequest
{

	optimisation: OptimisationTarget;
	productions: ProductionTarget[];
	recipes: Recipe[];
	/** User-supplied item sources: available up to `amount`/min, priced at `weight` in the objective. */
	inputs: InputSource[];
	maxSloops: number;
	/** Clock speed in percent for machines of recipes without an override. */
	defaultClockSpeed: number;
	/** Per-recipe clock-speed overrides in percent, keyed by recipe class name. */
	recipeClockSpeeds: Record<string, number>;
	/** Per-minute mining caps by raw resource class; absent entry = unlimited. */
	resourceLimits: Record<string, number>;
	/** Generator + fuel combinations the solver may burn for power. */
	generators: GeneratorFuelOption[];
	/** Requested power in MW the enabled generators must cover. */
	powerDemand: number;
	/** Also generate the power the factory's own machines draw (fuel chain included). */
	producePowerForFactory: boolean;
	/** Extra generation margin as a fraction of the factory draw (0.1 = 10%). */
	excessPowerFraction: number;
	/** Items the solver may feed into the AWESOME Sink. */
	sinkableItems: Item[];
	/** Requested sink points per minute the sinkable items must earn. */
	sinkPointsDemand: number;

}
