import {Recipe} from '@src/Model/Data/Entities/Recipe';

export interface RecipeUsageRow
{

	readonly recipe: Recipe;

	readonly machines: number;

}
