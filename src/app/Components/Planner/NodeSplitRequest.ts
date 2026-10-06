import {NodeSplitMode} from '@src/Model/Planner/NodeSplitMode';

export interface NodeSplitRequest
{
	readonly nodeId: string;
	readonly mode: NodeSplitMode;
}
