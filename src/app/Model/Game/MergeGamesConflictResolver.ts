import {Observable, of} from 'rxjs';
import {Game} from '@src/Model/Game/Game';
import {GameStore} from '@src/Model/Game/GameStore';
import {ConflictResolution} from '@src/Model/Sync/ConflictResolution';
import {ConflictResolver} from '@src/Model/Sync/ConflictResolver';

/** Games loaded before signing in join the account's; the same game keeps its newer save. */
export class MergeGamesConflictResolver implements ConflictResolver<GameStore>
{

	public resolve({local, remote}: ConflictResolution<GameStore>): Observable<GameStore>
	{
		const byId = new Map<string, Game>();
		[...remote.games, ...local.games].forEach(game => {
			const existing = byId.get(game.id);
			if (existing === undefined || game.loadedAt > existing.loadedAt) {
				byId.set(game.id, game);
			}
		});
		return of({games: [...byId.values()], active: {...local.active, ...remote.active}});
	}

}
