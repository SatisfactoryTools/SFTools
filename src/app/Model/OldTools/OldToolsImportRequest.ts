import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';
import {PlanFileContent} from '@src/Model/PlanFiles/PlanFileContent';

export interface OldToolsImportRequest
{
	readonly shareKeys: string[];
	readonly sourceVersion: OldGameVersion | null;
	readonly localLines: boolean;
	/** Old-format .sft files opened through the general "Import from file". */
	readonly files?: PlanFileContent[];
}
