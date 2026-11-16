import {Recipe} from '@src/Model/Data/Entities/Recipe';

export interface RecipeChoice
{

	readonly recipe: Recipe;
	readonly enabled: boolean;

}
