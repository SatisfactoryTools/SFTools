import {SolverWorkerResponseType} from '@src/Model/Planner/Solver/Worker/SolverWorkerResponseType';
import {RecipeUsage} from '@src/Model/Planner/RecipeUsage';
import {ResourceUsage} from '@src/Model/Planner/ResourceUsage';

export interface ProductionResponse
{
	readonly status: SolverWorkerResponseType;
	readonly recipeUsages: RecipeUsage[];
	readonly resourceInputs: ResourceUsage[];
}
