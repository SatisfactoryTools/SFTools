import {Item} from '@src/Model/Data/Entities/Item';

/** One raw resource of a pooled folder as seen from one inner plan. */
export interface PoolResourceStatus
{

	readonly item: Item;

	/** The folder's per-minute cap; null when unlimited (then nothing is pooled for it). */
	readonly limit: number | null;

	/** The folder switched the resource off - nothing may be mined regardless of the limit. */
	readonly disabled: boolean;

	/** Extraction by every other inner plan of the folder. */
	readonly usedByOthers: number;

	/** Extraction by this plan itself. */
	readonly usedByPlan: number;

	/** What this plan may still mine: limit minus others, floored at zero; null when unlimited. */
	readonly available: number | null;

	/** The plan mines more than its available share - another plan grew after it was solved. */
	readonly overUse: boolean;

}
