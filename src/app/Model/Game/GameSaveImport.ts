import {GamePlayer} from '@src/Model/Game/GamePlayer';

/** What a save adds to a game; a null part keeps what the game had. */
export interface GameSaveImport
{
	readonly saveIdentifier: string | null;
	readonly sessionName: string | null;
	readonly takenNodes: string[] | null;
	readonly collected: string[] | null;
	readonly players: GamePlayer[] | null;
}
