import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';
import {ShareVersion} from '@src/Model/API/Schema/Shares/ShareVersion';

export interface VisitedShare
{
	readonly share: string;
	readonly type: ShareType;
	readonly name: string;
	readonly sharedAt: string;
	readonly visitedAt: string;
	readonly version: ShareVersion;
	/** null = none, undefined = unknown (folder shares, rows from the API) - the ShareTreeCache snapshot then supplies it. */
	readonly iconClassName?: string | null;
}
