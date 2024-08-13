import {HighsSolution} from '@src/Model/Planner/Solver/HighsSolution';

export interface SolverWorkerResponse
{
	id: string;
	solution: HighsSolution | null;
	error: string | null;
}
