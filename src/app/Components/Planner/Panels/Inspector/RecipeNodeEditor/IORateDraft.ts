import {Item} from '@src/Model/Data/Entities/Item';

/** Mutable per-item rate field in the recipe node editor's production section. */
export interface IORateDraft
{

	readonly item: Item;
	rate: number;

}
