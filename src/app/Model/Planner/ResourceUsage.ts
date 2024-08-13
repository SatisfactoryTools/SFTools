import {Item} from '@src/Model/Data/Entities/Item';

export interface ResourceUsage
{
	readonly item: Item;
	readonly ratePerMinute: number;
}
