import {Observable, of, Subject, Subscription, throwError} from 'rxjs';
import {catchError, concatMap, debounceTime, map, tap} from 'rxjs/operators';
import {HttpErrorResponse} from '@angular/common/http';
import {GamesApiService} from '@src/Model/API/GamesApiService';
import {GameStore} from '@src/Model/Game/GameStore';
import {NotificationService} from '@src/Model/NotificationService';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {SyncReporter} from '@src/Model/Sync/SyncReporter';
import {SyncedStore} from '@src/Model/Sync/SyncedStore';

export class GamesApiDataBackend implements DataBackend<GameStore>, SyncReporter<GameStore>
{

	private revision = 0;
	private readonly saveSubject = new Subject<GameStore>();
	private readonly subscription: Subscription;

	private readonly syncedSubject = new Subject<SyncedStore<GameStore>>();
	public readonly synced: Observable<SyncedStore<GameStore>> = this.syncedSubject.asObservable();

	public constructor(
		private readonly api: GamesApiService,
		private readonly notifications: NotificationService,
		/** In the desktop app an offline mirror keeps unsaved edits, so a lost connection is not worth a warning. */
		private readonly connectionLossExpected = false,
	)
	{
		this.subscription = this.saveSubject.pipe(
			debounceTime(1000),
			concatMap(store => this.put(store).pipe(
				catchError(err => {
					console.error('Games API sync failed:', err);
					if (this.connectionLossExpected && err instanceof HttpErrorResponse && err.status === 0) {
						return of(void 0);
					}
					this.notifications.show('Could not save your game to your account. It works here, but is lost when you close the page.', 10_000);
					return of(void 0);
				}),
			)),
		).subscribe();
	}

	public load(): Observable<GameStore | null>
	{
		return this.api.get().pipe(
			map(response => {
				this.revision = response.revision;
				if (response.revision === 0 || !response.data || response.data === '{}') {
					return null;
				}
				try {
					return JSON.parse(response.data) as GameStore;
				} catch {
					return null;
				}
			}),
		);
	}

	public save(data: GameStore): Observable<void>
	{
		this.saveSubject.next(data);
		return of(void 0);
	}

	public clear(): Observable<void>
	{
		return of(void 0);
	}

	private put(store: GameStore): Observable<void>
	{
		return this.api.save(JSON.stringify(store), this.revision).pipe(
			tap(response => {
				this.revision = response.revision;
				this.syncedSubject.next({scope: '', data: store});
			}),
			map(() => void 0),
			catchError(err => {
				// Another session saved first: adopt its revision and retry, so the newest edit wins.
				if (err instanceof HttpErrorResponse && err.status === 409 && typeof err.error?.currentRevision === 'number') {
					this.revision = err.error.currentRevision;
					return this.put(store);
				}
				return throwError(() => err);
			}),
		);
	}

}
