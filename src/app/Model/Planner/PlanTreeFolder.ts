import {Folder} from '@src/Model/Planner/Folder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';

export interface PlanTreeFolder
{
	readonly folder: Folder;
	readonly children: PlanTreeFolder[];
	readonly plans: PlanTreePlan[];
	/** Interleaved with the folders: the user orders them freely. */
	readonly entries: (PlanTreeFolder | PlanTreePlan)[];
}
