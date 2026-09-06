import {Folder} from '@src/Model/Planner/Folder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';

export interface PlanTreeFolder
{
	readonly folder: Folder;
	readonly children: PlanTreeFolder[];
	readonly plans: PlanTreePlan[];
	/** Subfolders and top-level plans together in display order - the user may interleave them freely. */
	readonly entries: (PlanTreeFolder | PlanTreePlan)[];
}
