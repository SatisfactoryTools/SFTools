import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';

export interface GraphEdgeAmountRequest
{
	readonly edge: GraphEdge;
	readonly amount: number;
}
