import {Recipe} from '@src/Model/Data/Entities/Recipe';

/** Overview panel row: one recipe in use and the machines running it, nested subplans included. */
export interface RecipeUsageRow
{

	readonly recipe: Recipe;

	readonly machines: number;

}
