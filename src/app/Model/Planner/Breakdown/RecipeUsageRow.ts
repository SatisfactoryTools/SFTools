import {Recipe} from '@src/Model/Data/Entities/Recipe';

export interface RecipeUsageRow
{

	readonly recipe: Recipe;

	readonly machines: number;

	/** Empty when the row is not on this plan's canvas (folder views, buildings inside subplans). */
	readonly nodeIds: string[];

}
