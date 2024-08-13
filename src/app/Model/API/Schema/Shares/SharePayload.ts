import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';
import {ShareVersion} from '@src/Model/API/Schema/Shares/ShareVersion';

/** Response of GET /v1/shares/{uuid} - a frozen, read-only snapshot. */
export interface SharePayload
{
	share: string;
	type: ShareType;
	sharedAt: string;
	version: ShareVersion;
	/** A folder node when type is 'folder', a plan node when 'plan'. */
	root: SharedFolderNode | SharedPlanNode;
}
