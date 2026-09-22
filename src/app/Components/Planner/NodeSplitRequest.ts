import {NodeSplitMode} from '@src/Model/Planner/NodeSplitMode';

/** Splits one graph node into a copy per connection (see NodeSplitter). */
export interface NodeSplitRequest
{
	readonly nodeId: string;
	readonly mode: NodeSplitMode;
}
