import {Item} from '@src/Model/Data/Entities/Item';

export interface ResourceUsageRow
{

	readonly item: Item;

	readonly used: number;

	readonly limit: number | null;

	readonly disabled: boolean;

}
