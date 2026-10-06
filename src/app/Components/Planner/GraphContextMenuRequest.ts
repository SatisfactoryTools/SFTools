import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';
import {Node} from '@src/Model/Planner/Solver/Response/Node';

/** Empty nodes = canvas background, one = single-node menu, more = multi-node selection menu. */
export interface GraphContextMenuRequest
{
	readonly clientX: number;
	readonly clientY: number;
	readonly local: GraphPoint;
	readonly nodes: Node[];
	readonly edge?: GraphEdge;
}
