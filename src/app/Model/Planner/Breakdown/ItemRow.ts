import {Item} from '@src/Model/Data/Entities/Item';
import {ItemFlowRow} from '@src/Model/Planner/Breakdown/ItemFlowRow';

/** Items panel row: everything producing and consuming one item in the plan. */
export interface ItemRow
{

	readonly item: Item;

	readonly sources: ItemFlowRow[];

	readonly targets: ItemFlowRow[];

	readonly totalSources: number;

	readonly totalTargets: number;

	/** totalSources − totalTargets; non-zero means the plan is out of balance. */
	readonly net: number;

}
