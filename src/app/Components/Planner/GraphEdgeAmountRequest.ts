import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';

/** Sets one edge's flow (from the edge menu's minimise/maximise); the edge is matched by its source/target/item triple. */
export interface GraphEdgeAmountRequest
{
	readonly edge: GraphEdge;
	readonly amount: number;
}
