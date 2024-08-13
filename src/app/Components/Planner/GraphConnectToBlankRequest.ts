import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';

/** A connect gesture dropped on blank canvas - the counterpart node does not exist yet. */
export interface GraphConnectToBlankRequest
{
	/** The node the gesture started from. */
	readonly nodeId: string;
	readonly itemClassName: string;
	/** Which side was dragged: the node's output (new node consumes) or its input (new node produces). */
	readonly side: 'output' | 'input';
	/** Graph-local drop position, where the new node should appear. */
	readonly position: GraphPoint;
}
