import {Injectable, OnDestroy} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {HighsSolution} from '@src/Model/Planner/Solver/HighsSolution';
import {LpNameEncoder} from '@src/Model/Planner/Solver/LpNameEncoder';
import {SolverJob} from '@src/Model/Planner/Solver/SolverJob';
import {SolverWorkerCommand} from '@src/Model/Planner/Solver/Worker/SolverWorkerCommand';
import {SolverWorkerMessage} from '@src/Model/Planner/Solver/Worker/SolverWorkerMessage';
import {SolverWorkerOptions} from '@src/Model/Planner/Solver/Worker/SolverWorkerOptions';

const SOLVE_TIMEOUT_MS = 90_000;
const START_TIMEOUT_MS = 300_000;

/**
 * Jobs run one at a time so that the solve timeout only covers the solve itself: downloading highs.wasm on a slow
 * connection must not count against it, otherwise every attempt is killed mid-download and the next starts from zero.
 */
@Injectable({providedIn: 'root'})
export class SolverService implements OnDestroy
{

	private worker: Worker;
	private readonly queue: SolverJob[] = [];
	private activeJob: SolverJob | null = null;
	private nextId = 0;

	public constructor()
	{
		this.worker = this.createWorker();
	}

	public solve(problem: string, options: {workerOptions?: SolverWorkerOptions; timeoutMs?: number} = {}): Observable<HighsSolution>
	{
		const names = new LpNameEncoder();
		const encoded = names.encode(problem);
		return new Observable<HighsSolution>(subscriber => {
			const job = new SolverJob(
				{type: 'solve', id: String(this.nextId++), problem: encoded, options: options.workerOptions},
				options.timeoutMs ?? SOLVE_TIMEOUT_MS,
				subscriber,
			);
			this.queue.push(job);
			this.runNext();
			return () => this.cancel(job);
		}).pipe(map(solution => names.decode(solution)));
	}

	public ngOnDestroy(): void
	{
		this.activeJob?.abandon();
		this.queue.forEach(job => job.abandon());
		this.worker.terminate();
	}

	private runNext(): void
	{
		if (this.activeJob !== null) {
			return;
		}
		const job = this.queue.shift();
		if (job === undefined) {
			return;
		}
		this.activeJob = job;
		job.stage = 'sent';
		job.startTimer(START_TIMEOUT_MS, () => this.timeOut(job));
		this.post(job.request);
	}

	private handleMessage(message: SolverWorkerMessage): void
	{
		const job = this.activeJob;
		if (job === null || job.request.id !== message.id) {
			return;
		}
		if (message.type === 'progress') {
			job.stage = message.stage;
			if (message.stage === 'solving') {
				job.startTimer(job.solveTimeoutMs, () => this.timeOut(job));
			}
			return;
		}
		this.activeJob = null;
		if (message.error !== null) {
			job.fail(new Error(message.error));
		} else {
			job.succeed(message.solution!);
		}
		this.runNext();
	}

	private timeOut(job: SolverJob): void
	{
		const error = this.timeoutError(job);
		this.release(job);
		job.fail(error);
	}

	private timeoutError(job: SolverJob): Error
	{
		switch (job.stage) {
			case 'solving':
				return new Error(`The calculation took too long (${Math.round(job.solveTimeoutMs / 1000)} s) and was stopped. The plan may be too complex.`);
			case 'loading':
				return new Error(`Downloading the calculation engine took longer than ${Math.round(START_TIMEOUT_MS / 1000)} s. Check your internet connection. The download continues in the background, so try again in a moment.`);
			default:
				return new Error(`The calculation engine did not start within ${Math.round(START_TIMEOUT_MS / 1000)} s. Check your internet connection and try again.`);
		}
	}

	private cancel(job: SolverJob): void
	{
		if (!job.abandon()) {
			return;
		}
		const index = this.queue.indexOf(job);
		if (index !== -1) {
			this.queue.splice(index, 1);
			return;
		}
		this.release(job);
	}

	/** highs runs synchronously inside the worker, so a running solve can only be stopped by terminating it. Before that, the worker is kept so an ongoing download is not lost. */
	private release(job: SolverJob): void
	{
		if (this.activeJob !== job) {
			return;
		}
		this.activeJob = null;
		if (job.stage === 'solving') {
			this.restartWorker();
		} else {
			this.post({type: 'cancel', id: job.request.id});
		}
		this.runNext();
	}

	private post(command: SolverWorkerCommand): void
	{
		this.worker.postMessage(command);
	}

	private createWorker(): Worker
	{
		const worker = new Worker(
			new URL('./Worker/SolverWorker', import.meta.url),
			{type: 'module'},
		);
		worker.addEventListener('message', ({data}: MessageEvent<SolverWorkerMessage>) => this.handleMessage(data));
		worker.addEventListener('error', (event: ErrorEvent) => {
			console.error('[SolverWorker] Worker crashed:', event.message, event);
			const job = this.activeJob;
			this.activeJob = null;
			this.restartWorker();
			job?.fail(new Error(`The calculation crashed: ${event.message}`));
			this.runNext();
		});
		return worker;
	}

	private restartWorker(): void
	{
		this.worker.terminate();
		this.worker = this.createWorker();
	}

}
