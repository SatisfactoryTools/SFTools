import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {PowerRow} from '@src/Model/Planner/Breakdown/PowerRow';

export interface PowerBreakdown
{

	readonly rows: PowerRow[];

	/** Total draw of all machines, including subplans, with its oscillation band. */
	readonly consumption: PowerDraw;

	/** Total MW produced by generators, including subplans. */
	readonly production: number;

	/** Production minus consumption: a surplus is positive, a deficit negative. */
	readonly net: PowerDraw;

}
