import {Item} from '@src/Model/Data/Entities/Item';
import {PlanAmount} from '@src/Model/Planner/Breakdown/PlanAmount';

export interface FolderResourceRow
{

	readonly item: Item;

	readonly used: number;

	readonly limit: number | null;

	readonly disabled: boolean;

	readonly plans: PlanAmount[];

}
