import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';

export interface PlanStore
{
	readonly folders: Folder[];
	readonly plans: Plan[];
}
