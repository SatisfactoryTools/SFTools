import {Graph} from '@src/Model/Planner/Graph/Graph';

export interface SubplanInlineResult
{
	readonly graph: Graph;
	/** The nodes that came from the subplan, so the canvas can select them for moving. */
	readonly nodeIds: string[];
}
