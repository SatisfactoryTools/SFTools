import {OldProductionData} from '@src/Model/OldTools/OldProductionData';

/** Envelope of the old tools share API: GET /v2/share/{key} responses. */
export interface OldToolsShareResponse
{
	readonly code: number;
	readonly data: OldProductionData;
}
