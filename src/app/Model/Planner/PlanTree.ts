import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';

export interface PlanTree
{
	readonly rootPlans: PlanTreePlan[];
	readonly rootFolders: PlanTreeFolder[];
}
