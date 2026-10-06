import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';

export interface ShareHydration
{
	readonly folders: Folder[];
	readonly plans: Plan[];
	readonly idMap: Map<string, string>;
}
