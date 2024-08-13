import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {Node} from '@src/Model/Planner/Solver/Response/Node';

export interface GraphMergeResult
{

	/** All nodes of the merged graph: existing nodes (some with summed amounts) plus new ones. */
	readonly nodes: Node[];

	/** Rebuilt edges for the merged graph; routing is kept where the same connection existed before. */
	readonly edges: GraphEdge[];

	/** Incoming nodes with no existing counterpart - still unpositioned, need layout. */
	readonly newNodes: Node[];

}
