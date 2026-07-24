import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {SolverWorkerResponseType} from '@src/Model/Planner/Solver/Worker/SolverWorkerResponseType';

export interface SolverResponse
{

	status: SolverWorkerResponseType;
	nodes: Node[];
	/**
	 * Total achieved rate per maximised request, keyed by item class name (or
	 * the power/sink-points special class). Only present on maximise solves.
	 */
	achievedMaximums?: Record<string, number>;

}
