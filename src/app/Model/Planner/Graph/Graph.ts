import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';

export interface Graph
{
	readonly nodes: Node[];
	readonly edges: GraphEdge[];
}
