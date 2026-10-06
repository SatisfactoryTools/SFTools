import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';
import {ShareVersion} from '@src/Model/API/Schema/Shares/ShareVersion';

export interface SharePayload
{
	share: string;
	type: ShareType;
	sharedAt: string;
	version: ShareVersion;
	root: SharedFolderNode | SharedPlanNode;
}
