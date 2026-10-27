import {WorldSettings} from '@src/Model/Data/WorldSettings';
import {GamePlayer} from '@src/Model/Game/GamePlayer';

export interface SaveWorldMapResult
{
	readonly saveIdentifier: string | null;
	readonly world: WorldSettings;
	/** Null when the version has no world to compare with. */
	readonly sameWorld: boolean | null;
	readonly takenNodes: string[];
	/** Extractors on something this version's map does not have: nodes renamed since an older game, or modded ones. */
	readonly unplacedNodes: number;
	readonly collected: string[];
	readonly players: GamePlayer[];
}
