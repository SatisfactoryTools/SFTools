import {Item} from '@src/Model/Data/Entities/Item';

export interface HydratedItemAmount
{
	readonly item: Item;
	readonly amount: number;
}
