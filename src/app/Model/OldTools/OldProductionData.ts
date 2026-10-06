import {OldProductionMetadata} from '@src/Model/OldTools/OldProductionMetadata';
import {OldProductionRequest} from '@src/Model/OldTools/OldProductionRequest';

export interface OldProductionData
{
	readonly metadata: OldProductionMetadata;
	readonly request: OldProductionRequest;
	readonly result?: Record<string, number>;
}
