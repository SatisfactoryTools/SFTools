import {ResourceWeightMode} from '@src/Model/Planner/ResourceWeightMode';

/** One entry of the Resources tab's weight mode select. */
export interface ResourceWeightModeOption
{

	readonly mode: ResourceWeightMode;

	readonly label: string;

	readonly description: string;

}
