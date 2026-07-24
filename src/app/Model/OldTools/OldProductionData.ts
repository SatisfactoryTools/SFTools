import {OldProductionMetadata} from '@src/Model/OldTools/OldProductionMetadata';
import {OldProductionRequest} from '@src/Model/OldTools/OldProductionRequest';

/**
 * A complete production line as the old Satisfactory Tools stored it - the
 * payload of a share link (GET /v2/share/{key} → data) and of each entry in
 * a .sft export file's `tabs` array.
 */
export interface OldProductionData
{
	readonly metadata: OldProductionMetadata;
	readonly request: OldProductionRequest;
}
