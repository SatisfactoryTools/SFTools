import {Item} from '@src/Model/Data/Entities/Item';

export interface IORateDraft
{

	readonly item: Item;
	readonly perCraft: number;
	rate: number;

}
