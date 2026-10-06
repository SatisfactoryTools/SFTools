import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {PlanAmount} from '@src/Model/Planner/Breakdown/PlanAmount';

export interface FolderRecipeRow
{

	readonly recipe: Recipe;

	readonly machines: number;

	readonly plans: PlanAmount[];

}
