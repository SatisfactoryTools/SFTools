import {SaveFileUnlocks} from '@src/Model/SaveFile/SaveFileUnlocks';

export interface SaveFileWorkerResponse
{
	readonly unlocks: SaveFileUnlocks | null;
	/** Human-readable message when parsing failed; null on success. */
	readonly error: string | null;
}
