import {GroupingMode} from '@src/Model/Planner/GroupingMode';

export interface GroupingModeOption
{

	readonly mode: GroupingMode;
	readonly label: string;
	readonly description: string;

	/** The same mode when the machine count is set and the clocks are worked out. */
	readonly countDescription: string;

}
