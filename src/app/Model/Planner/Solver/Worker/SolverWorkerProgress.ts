import {SolverWorkerStage} from './SolverWorkerStage';

export interface SolverWorkerProgress
{
	type: 'progress';
	id: string;
	stage: SolverWorkerStage;
}
