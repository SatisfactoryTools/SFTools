import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {Plan} from '@src/Model/Planner/Plan';

/** Validated context of a pending edge insertion: the revived graph and the free flow at both ends. */
export interface PreparedEdgeAdd
{
	readonly plan: Plan;
	readonly graph: Graph;
	readonly source: Node;
	/** Source output not yet sent along any edge. */
	readonly spare: number;
	/** Target demand no edge supplies yet. */
	readonly demand: number;
}
