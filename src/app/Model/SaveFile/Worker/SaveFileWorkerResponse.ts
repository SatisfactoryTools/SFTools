import {SaveFileUnlocks} from '@src/Model/SaveFile/SaveFileUnlocks';

export interface SaveFileWorkerResponse
{
	readonly unlocks: SaveFileUnlocks | null;
	readonly error: string | null;
}
