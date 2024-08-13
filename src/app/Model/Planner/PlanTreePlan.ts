import {Plan} from '@src/Model/Planner/Plan';

export interface PlanTreePlan
{
	readonly plan: Plan;
	readonly subplans: PlanTreePlan[];
}
