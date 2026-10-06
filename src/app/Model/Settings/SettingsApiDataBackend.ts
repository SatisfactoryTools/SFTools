import {Observable, of, Subject, Subscription, throwError} from 'rxjs';
import {catchError, concatMap, debounceTime, map, tap} from 'rxjs/operators';
import {HttpErrorResponse} from '@angular/common/http';
import {SettingsApiService} from '@src/Model/API/SettingsApiService';
import {Settings} from '@src/Model/Settings/Settings';
import {NotificationService} from '@src/Model/NotificationService';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {SyncReporter} from '@src/Model/Sync/SyncReporter';
import {SyncedStore} from '@src/Model/Sync/SyncedStore';

export class SettingsApiDataBackend implements DataBackend<Settings>, SyncReporter<Settings>
{

	private revision = 0;
	private readonly saveSubject = new Subject<Settings>();
	private readonly subscription: Subscription;

	private readonly syncedSubject = new Subject<SyncedStore<Settings>>();
	public readonly synced: Observable<SyncedStore<Settings>> = this.syncedSubject.asObservable();

	public constructor(
		private readonly api: SettingsApiService,
		private readonly notifications: NotificationService,
		/** In the desktop app an offline mirror keeps unsaved edits, so a lost connection is not worth a warning. */
		private readonly connectionLossExpected = false,
	)
	{
		this.subscription = this.saveSubject.pipe(
			debounceTime(1000),
			concatMap(settings => this.put(settings).pipe(
				catchError(err => {
					console.error('Settings API sync failed:', err);
					if (this.connectionLossExpected && err instanceof HttpErrorResponse && err.status === 0) {
						return of(void 0);
					}
					this.notifications.show('Could not save your settings to your account. They apply here, but they will be lost if you close the page.', 10_000);
					return of(void 0);
				}),
			)),
		).subscribe();
	}

	public load(): Observable<Settings | null>
	{
		return this.api.get().pipe(
			map(response => {
				this.revision = response.revision;
				// revision 0 (or an empty payload) means "use client defaults".
				if (response.revision === 0 || !response.data || response.data === '{}') {
					return null;
				}
				try {
					return JSON.parse(response.data) as Settings;
				} catch {
					return null;
				}
			}),
		);
	}

	public save(data: Settings): Observable<void>
	{
		this.saveSubject.next(data);
		return of(void 0);
	}

	public clear(): Observable<void>
	{
		return of(void 0);
	}

	private put(settings: Settings): Observable<void>
	{
		return this.api.save(JSON.stringify(settings), this.revision).pipe(
			tap(response => {
				this.revision = response.revision;
				this.syncedSubject.next({scope: '', data: settings});
			}),
			map(() => void 0),
			catchError(err => {
				// Another session saved first: adopt its revision and retry so the local edit wins (there is only one settings object).
				if (err instanceof HttpErrorResponse && err.status === 409 && typeof err.error?.currentRevision === 'number') {
					this.revision = err.error.currentRevision;
					return this.put(settings);
				}
				return throwError(() => err);
			}),
		);
	}

}
