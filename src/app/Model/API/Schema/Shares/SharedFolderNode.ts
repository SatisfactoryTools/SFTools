import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';

/** A frozen folder in a share payload; `data` is a JSON string. */
export interface SharedFolderNode
{
	/** The sharer's original UUID - generate fresh ids when copying. */
	id: string;
	name: string;
	data: string;
	createdAt: string;
	children: SharedFolderNode[];
	plans: SharedPlanNode[];
}
