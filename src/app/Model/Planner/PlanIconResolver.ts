import {Injectable} from '@angular/core';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanLabelAssigner} from '@src/Model/Planner/PlanLabelAssigner';

@Injectable({providedIn: 'root'})
export class PlanIconResolver
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly labels: PlanLabelAssigner,
	)
	{
	}

	public iconHash(plan: Plan): string | null
	{
		const data = this.versionManager.activeVersionData();
		if (!data) {
			return null;
		}
		// Undefined only on plans saved before icons were stored, e.g. old shares nobody can re-save.
		const className = plan.iconClassName === undefined ? this.labels.generatedIcon(plan) : plan.iconClassName;
		return className === null ? null : data.iconForClassName(className);
	}

}
