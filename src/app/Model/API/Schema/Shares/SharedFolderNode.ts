import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';

export interface SharedFolderNode
{
	id: string;
	name: string;
	data: string;
	createdAt: string;
	children: SharedFolderNode[];
	plans: SharedPlanNode[];
}
