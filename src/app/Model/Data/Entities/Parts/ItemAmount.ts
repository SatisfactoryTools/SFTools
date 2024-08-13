import {Item} from '@src/Model/Data/Entities/Item';

export interface ItemAmount
{
	readonly item: Item;
	readonly amount: number;
}
