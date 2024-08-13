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
	/** User-supplied item sources the solver may draw from (see PlanInput). */
	readonly inputs: PlanInput[];
	readonly graph: Graph | null;
	readonly metadata: PlanMetadata;
	readonly revision: number | null;

	/**
	 * Plan icon selection, three states:
	 *  - undefined: not chosen yet - auto-filled from the first product added,
	 *    and derived (product/subplan-output) for display until then;
	 *  - null: explicitly "none" - always the generic plan icon, never auto-filled;
	 *  - string: an explicit item/building class name.
	 */
	readonly iconClassName?: string | null;

}
