import {Item} from '@src/Model/Data/Entities/Item';

export interface ResourceUsageRow
{

	readonly item: Item;

	readonly used: number;

	readonly limit: number | null;

	readonly disabled: boolean;

	/** Empty when the row is not on this plan's canvas (folder views, buildings inside subplans). */
	readonly nodeIds: string[];

}
