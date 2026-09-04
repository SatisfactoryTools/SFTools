import {Item} from '@src/Model/Data/Entities/Item';

/** Mutable per-item rate field in the recipe node editor's production section. */
export interface IORateDraft
{

	readonly item: Item;
	/** Amount of the item one recipe cycle takes or makes - shown as context beside the rate. */
	readonly perCraft: number;
	rate: number;

}
