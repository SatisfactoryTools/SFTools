import {Recipe} from '@src/Model/Data/Entities/Recipe';

export interface RecipeUsage
{
	readonly recipe: Recipe;
	readonly machineCount: number;
}
