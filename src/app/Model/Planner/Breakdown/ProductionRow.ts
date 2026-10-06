import {Item} from '@src/Model/Data/Entities/Item';

export interface ProductionRow
{

	readonly item: Item;

	readonly kind: 'product' | 'byproduct';

	readonly amount: number;

}
