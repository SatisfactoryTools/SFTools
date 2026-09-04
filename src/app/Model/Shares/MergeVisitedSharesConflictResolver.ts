import {Observable, of} from 'rxjs';
import {ConflictResolution} from '@src/Model/Sync/ConflictResolution';
import {ConflictResolver} from '@src/Model/Sync/ConflictResolver';
import {VisitedShare} from '@src/Model/Shares/VisitedShare';
import {VISITED_SHARES_CAP, VisitedShareStore} from '@src/Model/Shares/VisitedShareStore';

/**
 * Login-time merge of the anonymous visited-shares list with the account's:
 * union by share uuid (the newer visit wins), newest first, capped.
 */
export class MergeVisitedSharesConflictResolver implements ConflictResolver<VisitedShareStore>
{

	public resolve({local, remote}: ConflictResolution<VisitedShareStore>): Observable<VisitedShareStore>
	{
		const byShare = new Map<string, VisitedShare>();
		[...remote.shares, ...local.shares].forEach(entry => {
			const existing = byShare.get(entry.share);
			if (!existing || entry.visitedAt > existing.visitedAt) {
				byShare.set(entry.share, entry);
			}
		});
		const merged = [...byShare.values()]
			.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
			.slice(0, VISITED_SHARES_CAP);
		return of({shares: merged});
	}

}
