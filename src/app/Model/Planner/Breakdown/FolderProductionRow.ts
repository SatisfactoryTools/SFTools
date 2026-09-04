import {Item} from '@src/Model/Data/Entities/Item';
import {PlanAmount} from '@src/Model/Planner/Breakdown/PlanAmount';

/** Folder overview row: an item the folder's plans output, summed with the per-plan split. */
export interface FolderProductionRow
{

	readonly item: Item;

	readonly kind: 'product' | 'byproduct';

	readonly amount: number;

	readonly plans: PlanAmount[];

}
