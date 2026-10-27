import {SaveFileUnlocks} from '@src/Model/SaveFile/SaveFileUnlocks';
import {SaveFileWorld} from '@src/Model/SaveFile/SaveFileWorld';

export interface SaveFileContents
{
	readonly unlocks: SaveFileUnlocks;
	readonly world: SaveFileWorld;
}
