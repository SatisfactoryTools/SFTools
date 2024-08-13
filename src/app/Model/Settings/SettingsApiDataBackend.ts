import {Observable, of, Subject, Subscription, throwError} from 'rxjs';
import {catchError, concatMap, debounceTime, map, tap} from 'rxjs/operators';
import {HttpErrorResponse} from '@angular/common/http';
import {SettingsApiService} from '@src/Model/API/SettingsApiService';
import {Settings} from '@src/Model/Settings/Settings';
import {NotificationService} from '@src/Model/NotificationService';
import {DataBackend} from '@src/Model/Sync/DataBackend';

/**
 * Persists the single per-user settings object to the API. Saves are debounced
 * and serialised (one in flight at a time); a revision conflict is resolved in
 * favour of the local edit, matching the plan store's "use local" policy.
 */
export class SettingsApiDataBackend implements DataBackend<Settings>
{

	/** Server revision as of the last load/save; 0 means never saved. */
	private revision = 0;
	private readonly saveSubject = new Subject<Settings>();
	private readonly subscription: Subscription;

	public constructor(
		private readonly api: SettingsApiService,
		private readonly notifications: NotificationService,
	)
	{
		this.subscription = this.saveSubject.pipe(
			debounceTime(1000),
			concatMap(settings => this.put(settings).pipe(
				catchError(err => {
					console.error('Settings API sync failed:', err);
					this.notifications.show('Could not save settings to cloud. Your changes are saved locally.');
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
			tap(response => this.revision = response.revision),
			map(() => void 0),
			catchError(err => {
				// Another session saved first: adopt its revision and retry, so
				// the local edit wins (there is only one settings object).
				if (err instanceof HttpErrorResponse && err.status === 409 && typeof err.error?.currentRevision === 'number') {
					this.revision = err.error.currentRevision;
					return this.put(settings);
				}
				return throwError(() => err);
			}),
		);
	}

}
