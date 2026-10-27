import {SaveFileContents} from '@src/Model/SaveFile/SaveFileContents';

export interface SaveFileWorkerResponse
{
	readonly contents: SaveFileContents | null;
	readonly error: string | null;
}
