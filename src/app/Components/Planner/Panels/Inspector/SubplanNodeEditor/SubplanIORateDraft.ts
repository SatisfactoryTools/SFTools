import {Item} from '@src/Model/Data/Entities/Item';

/** Mutable per-item rate field in the subplan node editor - typing in one resizes the subplan. */
export interface SubplanIORateDraft
{

	readonly item: Item;
	rate: number;

}
