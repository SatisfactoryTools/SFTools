import {Item} from '@src/Model/Data/Entities/Item';
import {PlanAmount} from '@src/Model/Planner/Breakdown/PlanAmount';

/** Folder overview row: one raw resource, mined across every plan of the folder. */
export interface FolderResourceRow
{

	readonly item: Item;

	/** Total extraction of all plans in the folder. */
	readonly used: number;

	/**
	 * The folder's cap: the shared pool when pooled, the per-plan cap when the
	 * resources group is fixed; null when unlimited or when plans set their own.
	 */
	readonly limit: number | null;

	/** The folder switched the resource off for every plan inside (fixed or pooled resources only). */
	readonly disabled: boolean;

	readonly plans: PlanAmount[];

}
