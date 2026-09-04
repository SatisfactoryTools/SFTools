import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {PlanAmount} from '@src/Model/Planner/Breakdown/PlanAmount';

/** Folder overview row: one recipe across every plan of the folder, with the machines each plan runs. */
export interface FolderRecipeRow
{

	readonly recipe: Recipe;

	readonly machines: number;

	readonly plans: PlanAmount[];

}
