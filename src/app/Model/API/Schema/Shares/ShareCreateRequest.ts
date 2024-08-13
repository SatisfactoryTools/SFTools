import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';

/** Body of POST /v1/shares - freezes a folder/plan subtree into a share. */
export interface ShareCreateRequest
{
	/** The version the shared folder/plan belongs to. */
	version: string;
	type: ShareType;
	/** The folder or plan UUID to share (a subplan becomes the share's root). */
	id: string;
}
