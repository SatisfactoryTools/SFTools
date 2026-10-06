import {OldPlanGraphSource} from '@src/Model/OldTools/OldPlanGraphSource';
import {Plan} from '@src/Model/Planner/Plan';

export interface OldPlanImport
{
	readonly plan: Plan;
	readonly graphSource: OldPlanGraphSource;
}
