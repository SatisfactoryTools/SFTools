import {BuildCostMaterialRow} from '@src/Model/Planner/Breakdown/BuildCostMaterialRow';

export interface BuildCostRow
{

	readonly key: string;

	readonly name: string;

	readonly icon: string | null;

	readonly kind: 'machine' | 'subplan' | 'plan';

	readonly machines: number;

	readonly shards: number;

	readonly sloops: number;

	readonly materials: BuildCostMaterialRow[];

	/** Empty when the row is not on this plan's canvas (folder views, buildings inside subplans). */
	readonly nodeIds: string[];

}
