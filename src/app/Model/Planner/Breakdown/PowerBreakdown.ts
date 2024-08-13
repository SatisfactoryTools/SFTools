import {PowerRow} from '@src/Model/Planner/Breakdown/PowerRow';

export interface PowerBreakdown
{

	readonly rows: PowerRow[];

	/** Total MW drawn by machines, including subplans. */
	readonly consumption: number;

	/** Total MW produced by generators, including subplans. */
	readonly production: number;

}
