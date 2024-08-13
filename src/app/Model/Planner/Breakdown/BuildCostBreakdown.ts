import {BuildCostMaterialRow} from '@src/Model/Planner/Breakdown/BuildCostMaterialRow';
import {BuildCostRow} from '@src/Model/Planner/Breakdown/BuildCostRow';

export interface BuildCostBreakdown
{

	readonly rows: BuildCostRow[];

	readonly machines: number;

	readonly shards: number;

	readonly sloops: number;

	/** All rows' materials merged per item. */
	readonly materials: BuildCostMaterialRow[];

}
