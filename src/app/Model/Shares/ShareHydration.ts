import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';

/** A share payload converted to plan-store entities under fresh UUIDs. */
export interface ShareHydration
{
	readonly folders: Folder[];
	readonly plans: Plan[];
	/** Payload node id → the fresh id its copy got. */
	readonly idMap: Map<string, string>;
}
