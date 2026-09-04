import {Item} from '@src/Model/Data/Entities/Item';

/** Overview panel row: an item the plan outputs - a requested product or a leftover byproduct. */
export interface ProductionRow
{

	readonly item: Item;

	readonly kind: 'product' | 'byproduct';

	readonly amount: number;

}
