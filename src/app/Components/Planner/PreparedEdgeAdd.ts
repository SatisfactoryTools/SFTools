import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {Plan} from '@src/Model/Planner/Plan';

export interface PreparedEdgeAdd
{
	readonly plan: Plan;
	readonly graph: Graph;
	readonly source: Node;
	readonly spare: number;
	readonly demand: number;
}
