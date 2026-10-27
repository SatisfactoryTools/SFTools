import {Injectable} from '@angular/core';
import {Game} from '@src/Model/Game/Game';
import {RelativeTimeFormatter} from '@src/Model/RelativeTimeFormatter';

@Injectable({providedIn: 'root'})
export class GameLabels
{

	public name(game: Game): string
	{
		return game.sessionName || 'Your game';
	}

	/** A game with no save behind it only holds what was marked on the map. */
	public loaded(game: Game): string
	{
		return game.saveIdentifier === null && game.sessionName === null
			? 'Marked on the map'
			: `Loaded from a save ${RelativeTimeFormatter.ago(game.loadedAt)}`;
	}

}
