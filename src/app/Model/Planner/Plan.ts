import {Graph} from '@src/Model/Planner/Graph/Graph';
import {PlanInput} from '@src/Model/Planner/PlanInput';
import {PlanMetadata} from '@src/Model/Planner/PlanMetadata';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ProductionRequest} from '@src/Model/Planner/ProductionRequest';

export interface Plan
{

	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly folderId: string | null;
	readonly parentPlanId: string | null;
	readonly settings: PlanSettings;
	readonly requests: ProductionRequest[];
	readonly inputs: PlanInput[];
	readonly graph: Graph | null;
	readonly metadata: PlanMetadata;
	readonly revision: number | null;

	/** undefined = not chosen yet (auto-filled from the first product); null = explicitly none, never auto-filled. */
	readonly iconClassName?: string | null;

	readonly order?: number;

	/** Undefined = the server default (true): the flag is younger than most plans. */
	readonly linkAccess?: boolean;

}
