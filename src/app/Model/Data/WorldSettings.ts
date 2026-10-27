import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';

/** How the game placed the resource nodes. Null for a setting this app does not know. */
export interface WorldSettings
{
	readonly seed: number;
	readonly mode: WorldDataMode | null;
	readonly purity: WorldDataPurity | null;
}
