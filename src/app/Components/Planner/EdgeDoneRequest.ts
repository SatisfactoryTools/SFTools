import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';

export interface EdgeDoneRequest
{

	readonly edges: GraphEdge[];
	readonly done: boolean;

}
