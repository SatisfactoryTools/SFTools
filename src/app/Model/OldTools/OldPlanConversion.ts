import {Plan} from '@src/Model/Planner/Plan';

export interface OldPlanConversion
{
	readonly plan: Plan;
	readonly unknownClassNames: string[];
}
