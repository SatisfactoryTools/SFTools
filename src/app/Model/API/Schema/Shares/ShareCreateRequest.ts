import {ShareCreateFolderNode} from '@src/Model/API/Schema/Shares/ShareCreateFolderNode';
import {ShareCreatePlanNode} from '@src/Model/API/Schema/Shares/ShareCreatePlanNode';
import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';

/** Exactly one of `id` (a server-side folder/plan, needs auth) and `root` (the tree itself, anonymous) is sent. */
export interface ShareCreateRequest
{
	version: string;
	type: ShareType;
	id?: string;
	root?: ShareCreateFolderNode | ShareCreatePlanNode;
}
