import {ShareCreatePlanNode} from '@src/Model/API/Schema/Shares/ShareCreatePlanNode';

/**
 * A folder in the tree sent with POST /v1/shares. Mirrors the SharedFolderNode
 * the API gives back, minus the fields the server assigns.
 */
export interface ShareCreateFolderNode
{
	/** Optional - the server mints one when it is left out. Only an internal reference inside the snapshot. */
	id?: string;
	name: string;
	/** The folder's opaque data JSON, stored verbatim (see PlanDataSerializer). */
	data: string;
	children: ShareCreateFolderNode[];
	plans: ShareCreatePlanNode[];
}
