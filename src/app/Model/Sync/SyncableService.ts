import {Injectable, OnDestroy, Signal, WritableSignal, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Observable, Subscription, forkJoin, of, switchMap} from 'rxjs';
import {catchError, map, skip} from 'rxjs/operators';
import {AuthService} from '@src/Model/Auth/AuthService';
import {NotificationService} from '@src/Model/NotificationService';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {ConflictResolution} from '@src/Model/Sync/ConflictResolution';
import {ConflictResolver} from '@src/Model/Sync/ConflictResolver';
import {LoadResult} from '@src/Model/Sync/LoadResult';

@Injectable()
export abstract class SyncableService<T> implements OnDestroy
{

	private readonly dataSignal: WritableSignal<T>;
	public readonly data: Signal<T>;

	// Flips true once the first backend load settles (data or error), so callers
	// can wait for the real data before rendering instead of using emptyValue.
	private readonly loadedSignal: WritableSignal<boolean> = signal(false);
	public readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

	/**
	 * True when the last load failed outright. What is held then is the
	 * fallback default, not the user's data - saving it would replace what the
	 * server still has with it, so remote writes stay blocked until a load
	 * succeeds. (An empty store loads fine and leaves this false.)
	 */
	private readonly loadFailedSignal: WritableSignal<boolean> = signal(false);
	public readonly loadFailed: Signal<boolean> = this.loadFailedSignal.asReadonly();

	/** The "not being saved" warning is shown once per failed load, not on every edit that follows it. */
	private unsavedWarned = false;

	private activeBackend: DataBackend<T>;
	private readonly subscription = new Subscription();

	protected constructor(
		protected readonly authService: AuthService,
		protected readonly localBackend: DataBackend<T>,
		protected readonly remoteBackend: DataBackend<T> | null,
		private readonly conflictResolver: ConflictResolver<T>,
		private readonly emptyValue: T,
		private readonly notifications: NotificationService,
		/** What this store holds, for the "could not be loaded" message - "plans", "settings"... */
		private readonly label: string,
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
		// The edit stays in place for this session either way - it is only the
		// write to the account that waits, because the baseline it would be
		// written against was never loaded.
		if (this.loadFailedSignal() && this.activeBackend === this.remoteBackend) {
			this.warnUnsaved();
			return;
		}
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
		backend.load().subscribe({
			// A null load means the backend holds nothing (an empty account,
			// an untouched device, a scope with no store yet), so what is on
			// hand goes with it - keeping it would leave one scope's data, or
			// a signed-out session, showing what the previous one loaded.
			next: data => {
				this.dataSignal.set(data ?? this.emptyValue);
				this.settleLoad(false);
			},
			// The load still counts as settled: a resolver left pending forever
			// would leave the page blank. What changes is that the data now on
			// hand is known to be the default rather than the user's.
			error: () => this.settleLoad(true),
		});
	}

	private settleLoad(failed: boolean): void
	{
		this.loadFailedSignal.set(failed);
		if (!failed) {
			this.unsavedWarned = false;
		}
		this.loadedSignal.set(true);
		this.onLoaded();
	}

	/**
	 * Called after every backend load settles (initial and reload, success and
	 * failure alike). Beware: the initial call can happen inside this base
	 * constructor, before a subclass's own fields exist.
	 */
	protected onLoaded(): void
	{
	}

	private warnUnsaved(): void
	{
		if (this.unsavedWarned) return;
		this.unsavedWarned = true;
		this.notifications.show(
			`Your ${this.label} could not be loaded from the server, so changes are not being saved. Please reload the page in a moment.`,
			10_000,
		);
	}

	/** A load that keeps a failure distinguishable from an empty store. */
	private loadOutcome(backend: DataBackend<T>): Observable<LoadResult<T>>
	{
		return backend.load().pipe(
			map((data): LoadResult<T> => ({ok: true, data})),
			catchError(() => of<LoadResult<T>>({ok: false, data: null})),
		);
	}

	protected onLogin(): void
	{
		if (this.remoteBackend === null) return;

		const remote = this.remoteBackend;

		forkJoin({
			local: this.localBackend.load().pipe(catchError(() => of(null))),
			remote: this.loadOutcome(remote),
		}).pipe(
			switchMap(({local, remote: remoteResult}): Observable<T | null> => {
				// An unreachable server is not an account with nothing stored.
				// Merging on that reading would push this device's copy over
				// whatever the account actually holds, so nothing is written.
				if (!remoteResult.ok) return of(null);

				const remoteData = remoteResult.data;
				if (local === null) return of(remoteData ?? this.emptyValue);
				if (remoteData === null) return of(local);
				const conflict: ConflictResolution<T> = {local, remote: remoteData};
				return this.conflictResolver.resolve(conflict);
			}),
		).subscribe(resolved => {
			this.activeBackend = remote;
			if (resolved === null) {
				this.loadFailedSignal.set(true);
				this.warnUnsaved();
				return;
			}
			this.dataSignal.set(resolved);
			this.loadFailedSignal.set(false);
			this.unsavedWarned = false;
			remote.save(resolved).subscribe();
			this.localBackend.clear().subscribe();
		});
	}

	/**
	 * Signing out ends the account's session here and then: what was loaded
	 * from it is dropped and this device's own store is read back, so nothing
	 * of the signed-in user survives into the signed-out one. Deliberately
	 * nothing of it is written down to the device either - that would leave
	 * the account's data on a shared computer.
	 */
	protected onLogout(): void
	{
		this.activeBackend = this.localBackend;
		this.unsavedWarned = false;
		this.loadFailedSignal.set(false);
		this.dataSignal.set(this.emptyValue);
		this.loadFrom(this.localBackend);
	}

}
