import {SaveFileWorld} from '@src/Model/SaveFile/SaveFileWorld';

export interface SaveFileUnlocks
{
	readonly sessionName: string | null;
	readonly schematics: string[];
	readonly recipes: string[];
	/** null when the save has no game state to read it from. */
	readonly world: SaveFileWorld | null;
}
