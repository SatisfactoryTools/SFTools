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

	private readonly loadedSignal: WritableSignal<boolean> = signal(false);
	public readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

	/** Blocks remote writes until a load succeeds: what is held after a failed load is the default, and saving it would replace what the server still has. */
	private readonly loadFailedSignal: WritableSignal<boolean> = signal(false);
	public readonly loadFailed: Signal<boolean> = this.loadFailedSignal.asReadonly();

	/** The warning is shown once per failed load, not on every edit that follows it. */
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
		// The edit stays in place for this session; only the write to the account waits, because its baseline was never loaded.
		if (this.loadFailedSignal() && this.activeBackend === this.remoteBackend) {
			this.warnUnsaved();
			return;
		}
		this.activeBackend.save(data).subscribe();
	}

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
			// A null load means the backend holds nothing, so what is on hand is replaced too:
			// keeping it would show the previous scope's or session's data.
			next: data => {
				this.dataSignal.set(data ?? this.emptyValue);
				this.settleLoad(false);
			},
			// A failed load still counts as settled: a resolver left pending forever would leave the page blank.
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

	/** Beware: the initial call can happen inside this base constructor, before a subclass's own fields exist. */
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
				// An unreachable server is not an empty account: merging would push this device's copy over whatever the account holds.
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

	/** Deliberately writes nothing of the account's data to the device: that would leave it on a shared computer. */
	protected onLogout(): void
	{
		this.activeBackend = this.localBackend;
		this.unsavedWarned = false;
		this.loadFailedSignal.set(false);
		this.dataSignal.set(this.emptyValue);
		this.loadFrom(this.localBackend);
	}

}
