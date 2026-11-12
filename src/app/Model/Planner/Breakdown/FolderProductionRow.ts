import {Item} from '@src/Model/Data/Entities/Item';
import {ProductionKind} from '@src/Model/Planner/Breakdown/ProductionKind';
import {PlanAmount} from '@src/Model/Planner/Breakdown/PlanAmount';

export interface FolderProductionRow
{

	readonly item: Item;

	readonly kind: ProductionKind;

	/** AWESOME Sink points per minute; 0 unless the kind is 'sink'. */
	readonly points: number;

	readonly amount: number;

	readonly plans: PlanAmount[];

}
