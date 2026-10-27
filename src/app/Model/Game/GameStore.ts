import {Game} from '@src/Model/Game/Game';

export interface GameStore
{
	readonly games: Game[];
	/** Version id → the id of the game the map shows. */
	readonly active: Record<string, string>;
}
