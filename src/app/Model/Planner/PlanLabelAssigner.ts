import {Injectable} from '@angular/core';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {GraphIOResolver} from '@src/Model/Planner/GraphIOResolver';
import {Plan} from '@src/Model/Planner/Plan';

@Injectable({providedIn: 'root'})
export class PlanLabelAssigner
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly graphIO: GraphIOResolver,
	)
	{
	}

	/** Returns the same object when nothing changes, so unchanged plans are not saved again. */
	public assign(plan: Plan): Plan
	{
		if (!this.versionManager.activeVersionData()) {
			return plan;
		}
		const item = this.primaryItem(plan);
		const generatedName = item ? `${item.name} factory` : '';
		const generatedIcon = item?.className ?? null;
		// Plans saved before the flags existed: a label that matches what would be generated was never edited.
		const autoName = plan.autoName ?? (plan.name.trim() === '' || plan.name === generatedName);
		const autoIcon = plan.autoIcon ?? (plan.iconClassName === undefined || plan.iconClassName === generatedIcon);
		const name = autoName ? generatedName : plan.name;
		const iconClassName = autoIcon ? generatedIcon : plan.iconClassName ?? null;
		if (plan.autoName === autoName && plan.autoIcon === autoIcon && plan.name === name && plan.iconClassName === iconClassName) {
			return plan;
		}
		return {...plan, autoName, autoIcon, name, iconClassName};
	}

	public generatedIcon(plan: Plan): string | null
	{
		return this.primaryItem(plan)?.className ?? null;
	}

	private primaryItem(plan: Plan): Item | null
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
		const outputs = this.graphIO.resolve(plan.graph).outputs;
		return outputs.length > 0 ? outputs[0].item : null;
	}

}
