import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';

export interface PlanTree
{
	readonly rootPlans: PlanTreePlan[];
	readonly rootFolders: PlanTreeFolder[];
	/** Root folders and plans together in display order - the user may interleave them freely. */
	readonly entries: (PlanTreeFolder | PlanTreePlan)[];
}
