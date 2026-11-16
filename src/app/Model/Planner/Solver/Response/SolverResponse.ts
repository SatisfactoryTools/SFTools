import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {SolverWorkerResponseType} from '@src/Model/Planner/Solver/Worker/SolverWorkerResponseType';

export interface SolverResponse
{

	status: SolverWorkerResponseType;
	nodes: Node[];
	achievedMaximums?: Record<string, number>;
	/** By subplan node id: the factor a following subplan is resized by, or the number of copies. */
	subplanSizes?: Record<string, number>;

}
