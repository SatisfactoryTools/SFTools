import {SolverWorkerOptions} from './SolverWorkerOptions';

export interface SolverWorkerRequest
{
	id: string;
	problem: string;
	options?: SolverWorkerOptions;
}
