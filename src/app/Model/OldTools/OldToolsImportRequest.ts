import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';

export interface OldToolsImportRequest
{
	readonly shareKeys: string[];
	readonly sourceVersion: OldGameVersion | null;
	readonly localLines: boolean;
}
