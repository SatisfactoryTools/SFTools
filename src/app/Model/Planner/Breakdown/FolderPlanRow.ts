import {PowerDraw} from '@src/Model/Planner/PowerDraw';

/** Folder overview: one plan's power balance and artifacts, subplans included. */
export interface FolderPlanRow
{

	readonly planId: string;

	readonly name: string;

	/** The plan is in manual mode or hand-modified - the folder batch leaves it alone. */
	readonly manual: boolean;

	/** Settings or pool share changed since the plan's graph was solved. */
	readonly outdated: boolean;

	readonly consumption: PowerDraw;

	readonly production: number;

	/** Production minus consumption: a surplus is positive. */
	readonly net: PowerDraw;

	readonly shards: number;

	readonly sloops: number;

	readonly buildings: number;

}
