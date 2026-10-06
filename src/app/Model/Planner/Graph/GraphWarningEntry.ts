import {GraphWarningDetail} from '@src/Model/Planner/Graph/GraphWarningDetail';

export interface GraphWarningEntry
{

	readonly nodeId: string;

	readonly nodeName: string;

	readonly nodeIcon: string | null;

	readonly details: GraphWarningDetail[];

}
