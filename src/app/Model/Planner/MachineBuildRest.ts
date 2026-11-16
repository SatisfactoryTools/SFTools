import {GroupingMode} from '@src/Model/Planner/GroupingMode';

export interface MachineBuildRest
{

	readonly mode: GroupingMode;

	/** Used while `machines` is null; kept otherwise so switching back restores it. */
	readonly clockSpeed: number;

	/** Set when the user typed a machine count - the clocks are then worked out instead. */
	readonly machines: number | null;

	/** Somersloops in every rest machine; absent in builds saved before the rest could be slooped. */
	readonly sloops?: number;

}
