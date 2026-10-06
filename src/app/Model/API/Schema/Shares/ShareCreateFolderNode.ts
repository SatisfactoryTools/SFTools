import {ShareCreatePlanNode} from '@src/Model/API/Schema/Shares/ShareCreatePlanNode';

export interface ShareCreateFolderNode
{
	id?: string;
	name: string;
	data: string;
	children: ShareCreateFolderNode[];
	plans: ShareCreatePlanNode[];
}
