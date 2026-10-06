import {HttpErrorResponse} from '@angular/common/http';
import {Observable, of, throwError} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {NotificationService} from '@src/Model/NotificationService';
import {AppStorage} from '@src/Model/Storage/AppStorage';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {OfflineMerger} from '@src/Model/Sync/OfflineMerger';
import {OfflineMirror} from '@src/Model/Sync/OfflineMirror';
import {SyncReporter} from '@src/Model/Sync/SyncReporter';
import {SyncedStore} from '@src/Model/Sync/SyncedStore';

export class OfflineMirrorBackend<T> implements DataBackend<T>
{

	public static readonly KEY_PREFIX = 'sftools.offline.';

	private baselineKey: string | null = null;

	public constructor(
		private readonly remote: DataBackend<T>,
		reporter: SyncReporter<T> | null,
		private readonly storage: AppStorage,
		private readonly name: string,
		private readonly scopeOf: () => string | null,
		private readonly merger: OfflineMerger<T>,
		private readonly connectivity: ConnectivityService,
		private readonly notifications: NotificationService,
		private readonly label: string,
	)
	{
		// The base follows every save the account confirms, so a later merge only treats what really was not saved as offline edits.
		reporter?.synced.subscribe(synced => this.confirm(synced));
	}

	public load(): Observable<T | null>
	{
		const key = this.keyOf();
		if (key === null) {
			return this.remote.load();
		}
		if (!this.connectivity.online()) {
			return this.offlineCopy(key);
		}
		this.baselineKey = null;
		return this.remote.load().pipe(
			switchMap(remote => {
				this.baselineKey = key;
				return of(this.reconcile(key, remote));
			}),
			catchError((err: unknown) => err instanceof HttpErrorResponse && err.status === 0 && this.read(key) !== null
				? this.offlineCopy(key)
				: throwError(() => err)),
		);
	}

	public save(data: T): Observable<void>
	{
		const key = this.keyOf();
		if (key !== null) {
			this.write(key, {base: this.read(key)?.base ?? null, local: data});
		}
		// Offline, or before the account's copy was loaded for this scope, the edit waits in the mirror; the reload on reconnecting sends it.
		if (key === null || (this.connectivity.online() && this.baselineKey === key)) {
			return this.remote.save(data);
		}
		return of(void 0);
	}

	public clear(): Observable<void>
	{
		return this.remote.clear();
	}

	private offlineCopy(key: string): Observable<T | null>
	{
		const mirror = this.read(key);
		if (mirror === null) {
			return throwError(() => new HttpErrorResponse({status: 0, statusText: 'Offline'}));
		}
		return of(mirror.local ?? mirror.base);
	}

	private reconcile(key: string, remote: T | null): T | null
	{
		const mirror = this.read(key);
		if (mirror === null || mirror.local === null) {
			this.write(key, {base: remote, local: null});
			return remote;
		}
		const {data, changed, conflicts} = this.merger.merge(mirror.base, mirror.local, remote);
		if (!changed) {
			this.write(key, {base: remote, local: null});
			return remote;
		}
		// The remote backend's own baseline is what it just loaded, so this sends exactly the difference.
		this.write(key, {base: remote, local: data});
		this.remote.save(data).subscribe();
		this.notifications.show(
			conflicts === 0
				? `The changes to your ${this.label} made while offline were saved to your account.`
				: `The changes to your ${this.label} made while offline were saved to your account. ${conflicts} of them had also been changed elsewhere - both versions were kept.`,
			10_000,
		);
		return data;
	}

	/** Keyed by the scope the sync was for, not the current one: the user may have switched versions meanwhile. */
	private confirm({scope, data}: SyncedStore<T>): void
	{
		const key = this.keyFor(scope);
		const mirror = this.read(key);
		if (mirror === null) {
			return;
		}
		const confirmed = mirror.local !== null && JSON.stringify(mirror.local) === JSON.stringify(data);
		this.write(key, {base: data, local: confirmed ? null : mirror.local});
	}

	private keyOf(): string | null
	{
		const scope = this.scopeOf();
		return scope === null ? null : this.keyFor(scope);
	}

	private keyFor(scope: string): string
	{
		return OfflineMirrorBackend.KEY_PREFIX + this.name + (scope === '' ? '' : `.${scope}`);
	}

	private read(key: string): OfflineMirror<T> | null
	{
		const raw = this.storage.getItem(key);
		if (raw === null) {
			return null;
		}
		try {
			return JSON.parse(raw) as OfflineMirror<T>;
		} catch {
			return null;
		}
	}

	private write(key: string, mirror: OfflineMirror<T>): void
	{
		this.storage.setItem(key, JSON.stringify(mirror));
	}

}
