import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {SolverWorkerResponseType} from '@src/Model/Planner/Solver/Worker/SolverWorkerResponseType';

export interface SolverResponse
{

	status: SolverWorkerResponseType;
	nodes: Node[];

}
