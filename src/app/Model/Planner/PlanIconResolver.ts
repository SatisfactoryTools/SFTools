import {Injectable} from '@angular/core';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Plan} from '@src/Model/Planner/Plan';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';

@Injectable({providedIn: 'root'})
export class PlanIconResolver
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly subplanIO: SubplanIOResolver,
	)
	{
	}

	public iconHash(plan: Plan): string | null
	{
		const data = this.versionManager.activeVersionData();
		if (!data) {
			return null;
		}
		// null = explicit "none", undefined = not chosen yet.
		if (plan.iconClassName === null) {
			return null;
		}
		if (typeof plan.iconClassName === 'string') {
			return data.iconForClassName(plan.iconClassName);
		}
		return this.primaryItem(plan)?.icon ?? null;
	}

	public primaryItem(plan: Plan): Item | null
	{
		const data = this.versionManager.activeVersionData();
		if (!data) {
			return null;
		}
		for (const request of plan.requests) {
			const item = data.searchItemByClassName(request.itemClassName);
			if (item) {
				return item;
			}
		}
		const outputs = this.subplanIO.resolve(plan).outputs;
		return outputs.length > 0 ? outputs[0].item : null;
	}

}
