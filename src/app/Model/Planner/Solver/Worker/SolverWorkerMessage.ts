import {SolverWorkerProgress} from './SolverWorkerProgress';
import {SolverWorkerResponse} from './SolverWorkerResponse';

export type SolverWorkerMessage = SolverWorkerResponse | SolverWorkerProgress;
