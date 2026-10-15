import {Item} from '@src/Model/Data/Entities/Item';

export interface ProductionRow
{

	readonly item: Item;

	readonly kind: 'product' | 'byproduct';

	readonly amount: number;

	/** Empty when the row is not on this plan's canvas (folder views, buildings inside subplans). */
	readonly nodeIds: string[];

}
