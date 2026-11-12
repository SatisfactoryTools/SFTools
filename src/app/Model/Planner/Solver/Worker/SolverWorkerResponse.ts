import {HighsSolution} from '@src/Model/Planner/Solver/HighsSolution';

export interface SolverWorkerResponse
{
	type: 'result';
	id: string;
	solution: HighsSolution | null;
	error: string | null;
}
