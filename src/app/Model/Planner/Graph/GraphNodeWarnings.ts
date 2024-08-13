import {GraphNodeCapacityWarning} from '@src/Model/Planner/Graph/GraphNodeCapacityWarning';
import {GraphNodeInputWarning} from '@src/Model/Planner/Graph/GraphNodeInputWarning';
import {GraphNodeOutputWarning} from '@src/Model/Planner/Graph/GraphNodeOutputWarning';

export interface GraphNodeWarnings
{

	readonly inputs: GraphNodeInputWarning[];
	readonly outputs: GraphNodeOutputWarning[];
	readonly capacity: GraphNodeCapacityWarning | null;

}
