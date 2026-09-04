import {concat, Observable, of} from 'rxjs';
import {catchError, map, tap, toArray} from 'rxjs/operators';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {NotificationService} from '@src/Model/NotificationService';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {VisitedShareStore} from '@src/Model/Shares/VisitedShareStore';

/**
 * Syncs the visited-shares list through the per-entry API: save() diffs the
 * store against the last-synced state - new or re-visited entries become
 * PUTs (oldest first, so server-stamped timestamps preserve relative order),
 * missing ones become DELETEs. The server owns visitedAt and the cap.
 */
export class VisitedSharesApiDataBackend implements DataBackend<VisitedShareStore>
{

	/** Share uuid → visitedAt as of the last successful load/save. */
	private lastSynced = new Map<string, string>();

	public constructor(
		private readonly sharesApi: SharesApiService,
		private readonly notifications: NotificationService,
	)
	{
	}

	public load(): Observable<VisitedShareStore | null>
	{
		return this.sharesApi.getVisited().pipe(
			map(response => {
				const shares = [...response.shares].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
				this.lastSynced = new Map(shares.map(share => [share.share, share.visitedAt]));
				return {shares};
			}),
		);
	}

	public save(data: VisitedShareStore): Observable<void>
	{
		const current = new Map(data.shares.map(share => [share.share, share.visitedAt]));

		const deletes = [...this.lastSynced.keys()]
			.filter(uuid => !current.has(uuid))
			.map(uuid => this.sharesApi.removeVisit(uuid));
		const puts = data.shares
			.filter(share => this.lastSynced.get(share.share) !== share.visitedAt)
			.sort((a, b) => a.visitedAt.localeCompare(b.visitedAt))
			.map(share => this.sharesApi.recordVisit(share.share));

		const calls = [...deletes, ...puts];
		if (calls.length === 0) {
			return of(void 0);
		}
		return concat(...calls).pipe(
			toArray(),
			tap(() => {
				this.lastSynced = current;
			}),
			map(() => void 0),
			// Failed syncs keep lastSynced as it was, so the next save retries.
			catchError(err => {
				console.error('Visited shares sync failed:', err);
				this.notifications.show('Could not save the shared plans list to the cloud.');
				return of(void 0);
			}),
		);
	}

	public clear(): Observable<void>
	{
		return of(void 0);
	}

}
