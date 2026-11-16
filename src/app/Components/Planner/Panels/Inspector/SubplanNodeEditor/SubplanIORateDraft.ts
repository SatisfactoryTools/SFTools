import {Item} from '@src/Model/Data/Entities/Item';

export interface SubplanIORateDraft
{

	readonly item: Item;

	/** One build of the subplan. */
	rate: number;

}
