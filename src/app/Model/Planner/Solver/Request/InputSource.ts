import {Item} from '@src/Model/Data/Entities/Item';

/** A user-supplied item source for the solver: up to `amount`/min at `weight` cost per unit. */
export interface InputSource
{
	item: Item;
	amount: number;
	weight: number;
}
