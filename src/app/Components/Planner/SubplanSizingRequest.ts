import {SubplanSizing} from '@src/Model/Planner/SubplanSizing';

export interface SubplanSizingRequest
{

	readonly nodeId: string;

	readonly sizing: SubplanSizing;

}
