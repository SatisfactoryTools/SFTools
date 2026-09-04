import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';
import {ShareVersion} from '@src/Model/API/Schema/Shares/ShareVersion';

/**
 * One row of GET /v1/shares/visited. Everything but visitedAt is resolved
 * from the (frozen, permanent) share record server-side at read time.
 */
export interface VisitedShareSchema
{
	share: string;
	type: ShareType;
	name: string;
	sharedAt: string;
	visitedAt: string;
	version: ShareVersion;
}
