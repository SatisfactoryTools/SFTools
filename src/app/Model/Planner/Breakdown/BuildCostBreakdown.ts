import {BuildCostMaterialRow} from '@src/Model/Planner/Breakdown/BuildCostMaterialRow';
import {BuildCostRow} from '@src/Model/Planner/Breakdown/BuildCostRow';

export interface BuildCostBreakdown
{

	readonly rows: BuildCostRow[];

	readonly machines: number;

	readonly builtMachines: number;

	readonly shards: number;

	readonly sloops: number;

	readonly materials: BuildCostMaterialRow[];

	readonly remainingMaterials: BuildCostMaterialRow[];

}
