import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';

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
