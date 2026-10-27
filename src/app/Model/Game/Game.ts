import {GamePlayer} from '@src/Model/Game/GamePlayer';

/** One playthrough, as its save files describe it. Plans never own it: it belongs to a game version. */
export interface Game
{
	readonly id: string;
	readonly versionId: string;
	/** The save's own id, the same across every save of one playthrough: a newer save updates its game. */
	readonly saveIdentifier: string | null;
	readonly sessionName: string | null;
	/** ISO date of the last save loaded into it. */
	readonly loadedAt: string;
	/** Nodes, wells and geysers with an extractor on them. */
	readonly takenNodes: string[];
	/** Pickups and drop pods already collected. */
	readonly collected: string[];
	readonly players: GamePlayer[];
	/** Marked by hand on the map; kept over newer saves until a save agrees with them. */
	readonly takenMarks: Record<string, boolean>;
	readonly collectedMarks: Record<string, boolean>;
}
