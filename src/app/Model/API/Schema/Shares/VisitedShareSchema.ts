import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';
import {ShareVersion} from '@src/Model/API/Schema/Shares/ShareVersion';

export interface VisitedShareSchema
{
	share: string;
	type: ShareType;
	name: string;
	sharedAt: string;
	visitedAt: string;
	version: ShareVersion;
}
