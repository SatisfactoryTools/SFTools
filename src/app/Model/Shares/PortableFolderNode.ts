import {PortablePlanNode} from '@src/Model/Shares/PortablePlanNode';

export interface PortableFolderNode
{
	id: string;
	name: string;
	data: string;
	children: PortableFolderNode[];
	plans: PortablePlanNode[];
}
