import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';

export interface GraphConnectToBlankRequest
{
	readonly nodeId: string;
	readonly itemClassName: string;
	readonly side: 'output' | 'input';
	readonly position: GraphPoint;
}
