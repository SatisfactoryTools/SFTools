import {Injectable, OnDestroy, Signal, WritableSignal, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Observable, Subscription, forkJoin, of, switchMap} from 'rxjs';
import {catchError, skip} from 'rxjs/operators';
import {AuthService} from '@src/Model/Auth/AuthService';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {ConflictResolution} from '@src/Model/Sync/ConflictResolution';
import {ConflictResolver} from '@src/Model/Sync/ConflictResolver';

@Injectable()
export abstract class SyncableService<T> implements OnDestroy
{

	private readonly dataSignal: WritableSignal<T>;
	public readonly data: Signal<T>;

	// Flips true once the first backend load settles (data or error), so callers
	// can wait for the real data before rendering instead of using emptyValue.
	private readonly loadedSignal: WritableSignal<boolean> = signal(false);
	public readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

	private activeBackend: DataBackend<T>;
	private readonly subscription = new Subscription();

	protected constructor(
		protected readonly authService: AuthService,
		protected readonly localBackend: DataBackend<T>,
		protected readonly remoteBackend: DataBackend<T> | null,
		private readonly conflictResolver: ConflictResolver<T>,
		private readonly emptyValue: T,
	)
	{
		this.dataSignal = signal(emptyValue);
		this.data = this.dataSignal.asReadonly();

		if (authService.isAuthenticated() && remoteBackend !== null) {
			this.activeBackend = remoteBackend;
			this.loadFrom(remoteBackend);
		} else {
			this.activeBackend = localBackend;
			this.loadFrom(localBackend);
		}

		this.subscription.add(
			toObservable(authService.isAuthenticated).pipe(skip(1)).subscribe(isAuthenticated => {
				if (isAuthenticated) {
					this.onLogin();
				} else {
					this.onLogout();
				}
			}),
		);
	}

	protected persist(data: T): void
	{
		this.dataSignal.set(data);
		this.activeBackend.save(data).subscribe();
	}

	/** Re-fetches from the active backend, e.g. when the backend's scope (game version) changes. */
	protected reload(): void
	{
		this.loadFrom(this.activeBackend);
	}

	protected setActiveBackend(backend: DataBackend<T>): void
	{
		this.activeBackend = backend;
	}

	protected setData(data: T): void
	{
		this.dataSignal.set(data);
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

	protected loadFrom(backend: DataBackend<T>): void
	{
		backend.load().pipe(catchError(() => of(null))).subscribe(data => {
			if (data !== null) this.dataSignal.set(data);
			this.loadedSignal.set(true);
		});
	}

	protected onLogin(): void
	{
		if (this.remoteBackend === null) return;

		const remote = this.remoteBackend;

		forkJoin({
			local: this.localBackend.load().pipe(catchError(() => of(null))),
			remote: remote.load().pipe(catchError(() => of(null))),
		}).pipe(
			switchMap(({local, remote: remoteData}): Observable<T> => {
				if (local === null) return of(remoteData ?? this.emptyValue);
				if (remoteData === null) return of(local);
				const conflict: ConflictResolution<T> = {local, remote: remoteData};
				return this.conflictResolver.resolve(conflict);
			}),
		).subscribe(resolved => {
			this.dataSignal.set(resolved);
			remote.save(resolved).subscribe();
			this.localBackend.clear().subscribe();
			this.activeBackend = remote;
		});
	}

	protected onLogout(): void
	{
		const current = this.dataSignal();
		this.localBackend.save(current).subscribe();
		this.activeBackend = this.localBackend;
	}

}
