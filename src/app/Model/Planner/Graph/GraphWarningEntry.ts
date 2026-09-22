import {GraphWarningDetail} from '@src/Model/Planner/Graph/GraphWarningDetail';

/** One warning-bearing node of the rendered graph, ready for list display. */
export interface GraphWarningEntry
{

	readonly nodeId: string;

	readonly nodeName: string;

	/** The node's own icon (machine or item); null for nodes without one. */
	readonly nodeIcon: string | null;

	/** Every warning the node carries. */
	readonly details: GraphWarningDetail[];

}
