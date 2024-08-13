import {Injectable, OnDestroy} from '@angular/core';
import {filter, map, Observable, race, Subject, take, throwError, timeout} from 'rxjs';
import {HighsSolution} from '@src/Model/Planner/Solver/HighsSolution';
import {SolverWorkerOptions} from '@src/Model/Planner/Solver/Worker/SolverWorkerOptions';
import {SolverWorkerRequest} from '@src/Model/Planner/Solver/Worker/SolverWorkerRequest';
import {SolverWorkerResponse} from '@src/Model/Planner/Solver/Worker/SolverWorkerResponse';

const SOLVE_TIMEOUT_MS = 90_000;

@Injectable({providedIn: 'root'})
export class SolverService implements OnDestroy
{

	private worker: Worker;
	private readonly messagesSubject = new Subject<SolverWorkerResponse>();
	private readonly workerErrorSubject = new Subject<Error>();
	private readonly pendingIds = new Set<string>();
	private nextId = 0;

	public constructor()
	{
		this.worker = this.createWorker();
	}

	/**
	 * Unsubscribing while the solve is still running cancels it: highs runs
	 * synchronously inside the worker, so the only way to stop it is to
	 * terminate the worker and spawn a fresh one (the WASM lib reloads on the
	 * next solve). This also reaps a stuck worker when the timeout fires.
	 * MIP solves (sloops) pass their gap and a longer timeout via options.
	 */
	public solve(problem: string, options: {workerOptions?: SolverWorkerOptions; timeoutMs?: number} = {}): Observable<HighsSolution>
	{
		const timeoutMs = options.timeoutMs ?? SOLVE_TIMEOUT_MS;
		return new Observable<HighsSolution>(subscriber => {
			const id = String(this.nextId++);
			const response$ = this.messagesSubject.pipe(
				filter(response => response.id === id),
				take(1),
				map(response => {
					if (response.error !== null) {
						throw new Error(response.error);
					}
					return response.solution!;
				}),
			);
			const inner = race(
				response$,
				this.workerErrorSubject.pipe(
					take(1),
					map(err => { throw err; }),
				),
			).pipe(
				timeout({
					each: timeoutMs,
					with: () => throwError(() => new Error(`Solver timed out (${Math.round(timeoutMs / 1000)} s). The problem may be too complex.`)),
				}),
			).subscribe(subscriber);

			this.pendingIds.add(id);
			this.worker.postMessage({id, problem, options: options.workerOptions} satisfies SolverWorkerRequest);

			return () => {
				inner.unsubscribe();
				if (this.pendingIds.delete(id)) {
					this.restartWorker();
				}
			};
		});
	}

	public ngOnDestroy(): void
	{
		this.worker.terminate();
		this.messagesSubject.complete();
		this.workerErrorSubject.complete();
	}

	private createWorker(): Worker
	{
		const worker = new Worker(
			new URL('./Worker/SolverWorker', import.meta.url),
			{type: 'module'},
		);
		worker.addEventListener('message', ({data}: MessageEvent<SolverWorkerResponse>) => {
			this.pendingIds.delete(data.id);
			this.messagesSubject.next(data);
		});
		worker.addEventListener('error', (event: ErrorEvent) => {
			console.error('[SolverWorker] Worker crashed:', event.message, event);
			this.workerErrorSubject.next(new Error(`Solver worker crashed: ${event.message}`));
		});
		return worker;
	}

	private restartWorker(): void
	{
		this.worker.terminate();
		this.worker = this.createWorker();
	}

}
