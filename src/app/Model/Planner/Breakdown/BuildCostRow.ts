import {BuildCostMaterialRow} from '@src/Model/Planner/Breakdown/BuildCostMaterialRow';

/** Build cost panel row: one building type, or one subplan summed up. */
export interface BuildCostRow
{

	readonly key: string;

	readonly name: string;

	/** Building icon hash for a machine row; null for subplan/plan aggregate rows. */
	readonly icon: string | null;

	readonly kind: 'machine' | 'subplan' | 'plan';

	readonly machines: number;

	readonly shards: number;

	readonly sloops: number;

	/** Total construction materials for all machines of this row. */
	readonly materials: BuildCostMaterialRow[];

}
