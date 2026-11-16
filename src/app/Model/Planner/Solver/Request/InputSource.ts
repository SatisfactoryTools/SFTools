import {Item} from '@src/Model/Data/Entities/Item';

export interface InputSource
{
	item: Item;
	/** Infinity for an input without a limit. */
	amount: number;
	weight: number;
}
