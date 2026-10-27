import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';
import {GamePlayer} from '@src/Model/Game/GamePlayer';

export interface SaveFileWorld
{
	/** The same for every save of one playthrough. */
	readonly saveIdentifier: string | null;
	readonly seed: number;
	/** Null for a setting this app does not know yet. */
	readonly mode: WorldDataMode | null;
	readonly purity: WorldDataPurity | null;
	/** Everything an extractor stands on, by name: nodes, wells, geysers and well cores. */
	readonly extractedNodes: string[];
	/** Pickups and looted drop pods, by the actor names the map's collectibles use. */
	readonly collected: string[];
	readonly players: GamePlayer[];
}
