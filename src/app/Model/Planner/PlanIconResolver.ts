import {Injectable} from '@angular/core';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Plan} from '@src/Model/Planner/Plan';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';

/**
 * The icon hash to show for a plan or subplan: the user's override if set,
 * otherwise the first product it makes - a top-level plan's first requested
 * item, or (for subplans, which have no requests) its first graph output.
 * Null means none applies - callers fall back to the generic plan icon.
 */
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
		// null = explicit "none" → the generic plan icon.
		if (plan.iconClassName === null) {
			return null;
		}
		// A chosen item/building class name.
		if (typeof plan.iconClassName === 'string') {
			return data.iconForClassName(plan.iconClassName);
		}
		// undefined = not chosen yet → derive from what it makes (mainly for
		// subplans; a top-level plan's icon is saved when its first item is added).
		return this.primaryItem(plan)?.icon ?? null;
	}

	/** The first product the plan makes: its first requested item, or (for subplans) its first output. */
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
