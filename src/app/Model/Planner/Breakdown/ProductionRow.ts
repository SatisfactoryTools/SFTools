import {Item} from '@src/Model/Data/Entities/Item';
import {ProductionKind} from '@src/Model/Planner/Breakdown/ProductionKind';

export interface ProductionRow
{

	readonly item: Item;

	readonly kind: ProductionKind;

	/** AWESOME Sink points per minute; 0 unless the kind is 'sink'. */
	readonly points: number;

	readonly amount: number;

	/** Empty when the row is not on this plan's canvas (folder views, buildings inside subplans). */
	readonly nodeIds: string[];

}
