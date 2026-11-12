import {Subscriber} from 'rxjs';
import {HighsSolution} from '@src/Model/Planner/Solver/HighsSolution';
import {SolverJobStage} from '@src/Model/Planner/Solver/SolverJobStage';
import {SolverWorkerRequest} from '@src/Model/Planner/Solver/Worker/SolverWorkerRequest';

export class SolverJob
{

	public stage: SolverJobStage = 'queued';
	public finished = false;
	private timer: ReturnType<typeof setTimeout> | null = null;

	public constructor(
		public readonly request: SolverWorkerRequest,
		public readonly solveTimeoutMs: number,
		private readonly subscriber: Subscriber<HighsSolution>,
	)
	{
	}

	public startTimer(ms: number, onTimeout: () => void): void
	{
		this.clearTimer();
		this.timer = setTimeout(onTimeout, ms);
	}

	public succeed(solution: HighsSolution): void
	{
		if (this.abandon()) {
			this.subscriber.next(solution);
			this.subscriber.complete();
		}
	}

	public fail(error: Error): void
	{
		if (this.abandon()) {
			this.subscriber.error(error);
		}
	}

	public abandon(): boolean
	{
		if (this.finished) {
			return false;
		}
		this.finished = true;
		this.clearTimer();
		return true;
	}

	private clearTimer(): void
	{
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

}
