import {SolverWorkerOptions} from './SolverWorkerOptions';

export interface SolverWorkerRequest
{
	type: 'solve';
	id: string;
	problem: string;
	options?: SolverWorkerOptions;
}
