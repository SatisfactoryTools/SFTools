import {PortableFolderNode} from '@src/Model/Shares/PortableFolderNode';
import {PortablePlanNode} from '@src/Model/Shares/PortablePlanNode';

export interface PlanFileRoot
{
	type: 'plan' | 'folder';
	node: PortablePlanNode | PortableFolderNode;
}
