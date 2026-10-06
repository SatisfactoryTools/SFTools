import {Item} from '@src/Model/Data/Entities/Item';
import {ItemFlowRow} from '@src/Model/Planner/Breakdown/ItemFlowRow';

export interface ItemRow
{

	readonly item: Item;

	readonly sources: ItemFlowRow[];

	readonly targets: ItemFlowRow[];

	readonly totalSources: number;

	readonly totalTargets: number;

	readonly net: number;

}
