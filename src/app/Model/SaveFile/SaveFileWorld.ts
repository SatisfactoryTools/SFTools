import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';

/** The node randomization chosen at world creation - enough for the world-data preview to rebuild the exact node counts. */
export interface SaveFileWorld
{
	readonly seed: number;
	readonly mode: WorldDataMode;
	readonly purity: WorldDataPurity;
}
