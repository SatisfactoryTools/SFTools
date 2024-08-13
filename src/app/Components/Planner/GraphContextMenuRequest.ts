import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';
import {Node} from '@src/Model/Planner/Solver/Response/Node';

/**
 * Emitted by PlannerGraphService when the canvas is right-clicked. An edge
 * means the click landed on that edge; otherwise an empty nodes array means
 * the canvas background, one entry a single-node menu, and more entries a
 * multi-node selection menu.
 */
export interface GraphContextMenuRequest
{
	readonly clientX: number;
	readonly clientY: number;
	/** Click position in graph-local coordinates. */
	readonly local: GraphPoint;
	readonly nodes: Node[];
	readonly edge?: GraphEdge;
}
