import {PowerDraw} from '@src/Model/Planner/PowerDraw';

export interface FolderPlanRow
{

	readonly planId: string;

	readonly name: string;

	readonly manual: boolean;

	readonly outdated: boolean;

	readonly consumption: PowerDraw;

	readonly production: number;

	readonly net: PowerDraw;

	readonly shards: number;

	readonly sloops: number;

	readonly buildings: number;

}
