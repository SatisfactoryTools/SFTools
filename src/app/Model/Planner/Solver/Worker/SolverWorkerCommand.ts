import {SolverWorkerCancel} from './SolverWorkerCancel';
import {SolverWorkerRequest} from './SolverWorkerRequest';

export type SolverWorkerCommand = SolverWorkerRequest | SolverWorkerCancel;
