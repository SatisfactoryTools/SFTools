import {SolverWorkerStage} from '@src/Model/Planner/Solver/Worker/SolverWorkerStage';

export type SolverJobStage = 'queued' | 'sent' | SolverWorkerStage;
