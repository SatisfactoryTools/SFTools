import {Item} from '@src/Model/Data/Entities/Item';

/** Overview panel row: one raw resource, its extraction rate and the plan's mining cap. */
export interface ResourceUsageRow
{

	readonly item: Item;

	/** Per-minute extraction across the plan, nested subplans included. */
	readonly used: number;

	/** The plan's per-minute cap for this resource; null when unlimited. */
	readonly limit: number | null;

	/** The plan switched the resource off - nothing may be mined regardless of the limit. */
	readonly disabled: boolean;

}
