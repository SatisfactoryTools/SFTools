import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';

/**
 * Turns a plan or folder into the opaque `data` JSON string the API stores for
 * it. The same string goes into a plan/folder PUT and into a share created
 * from a tree the client sends, so both paths always agree on what a shared
 * plan contains - `SharePayloadHydrator` reads exactly these keys back.
 */
export class PlanDataSerializer
{

	public static plan(plan: Plan): string
	{
		return JSON.stringify({
			settings: plan.settings,
			requests: plan.requests,
			inputs: plan.inputs,
			graph: plan.graph,
			metadata: plan.metadata,
			iconClassName: plan.iconClassName,
			order: plan.order,
		});
	}

	public static folder(folder: Folder): string
	{
		return JSON.stringify({
			settings: folder.settings ?? undefined,
			fixedGroups: folder.fixedGroups.length > 0 ? folder.fixedGroups : undefined,
			resourcePool: folder.resourcePool || undefined,
			order: folder.order,
		});
	}

}
