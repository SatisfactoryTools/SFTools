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

}
