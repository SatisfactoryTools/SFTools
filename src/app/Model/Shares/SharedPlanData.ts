import {Graph} from '@src/Model/Planner/Graph/Graph';
import {PlanInput} from '@src/Model/Planner/PlanInput';
import {PlanMetadata} from '@src/Model/Planner/PlanMetadata';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ProductionRequest} from '@src/Model/Planner/ProductionRequest';

/** The parsed `data` JSON of a shared plan node - same payload plans store on the API. */
export interface SharedPlanData
{
	settings?: PlanSettings;
	requests?: ProductionRequest[];
	inputs?: PlanInput[];
	graph?: Graph | null;
	metadata?: PlanMetadata;
	iconClassName?: string | null;
}
