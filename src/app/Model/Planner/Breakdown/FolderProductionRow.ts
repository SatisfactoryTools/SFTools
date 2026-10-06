import {Item} from '@src/Model/Data/Entities/Item';
import {PlanAmount} from '@src/Model/Planner/Breakdown/PlanAmount';

export interface FolderProductionRow
{

	readonly item: Item;

	readonly kind: 'product' | 'byproduct';

	readonly amount: number;

	readonly plans: PlanAmount[];

}
