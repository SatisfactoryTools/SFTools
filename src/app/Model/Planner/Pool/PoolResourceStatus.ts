import {Item} from '@src/Model/Data/Entities/Item';

export interface PoolResourceStatus
{

	readonly item: Item;

	readonly limit: number | null;

	readonly disabled: boolean;

	readonly usedByOthers: number;

	readonly usedByPlan: number;

	readonly available: number | null;

	readonly overUse: boolean;

}
