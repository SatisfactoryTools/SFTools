import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {Node} from '@src/Model/Planner/Solver/Response/Node';

export interface GraphMergeResult
{

	readonly nodes: Node[];

	readonly edges: GraphEdge[];

	readonly newNodes: Node[];

}
