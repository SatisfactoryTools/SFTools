import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';

export interface EdgeDoneRequest
{

	readonly edge: GraphEdge;
	readonly done: boolean;

}
