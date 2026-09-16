import {ShareCreateFolderNode} from '@src/Model/API/Schema/Shares/ShareCreateFolderNode';
import {ShareCreatePlanNode} from '@src/Model/API/Schema/Shares/ShareCreatePlanNode';
import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';

/**
 * Body of POST /v1/shares - freezes a folder/plan subtree into a share.
 * Exactly one of `id` and `root` is sent: `id` points at a folder/plan the
 * signed-in caller owns on the server, `root` carries the tree itself and
 * needs no account (see anonymous-shares.md).
 */
export interface ShareCreateRequest
{
	/** The version the shared folder/plan belongs to. */
	version: string;
	type: ShareType;
	/** The folder or plan UUID to share (a subplan becomes the share's root); requires authentication. */
	id?: string;
	/** The tree to freeze, for plans that live only in this browser. */
	root?: ShareCreateFolderNode | ShareCreatePlanNode;
}
