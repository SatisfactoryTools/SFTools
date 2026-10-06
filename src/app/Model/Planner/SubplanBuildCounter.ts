import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';

@Injectable({providedIn: 'root'})
export class SubplanBuildCounter
{

	public constructor(
		private readonly planManager: PlanManager,
	)
	{
	}

	public buildsOf(plan: Plan | null): number
	{
		if (!plan?.parentPlanId) {
			return 0;
		}
		return this.countIn(this.planManager.findPlan(plan.parentPlanId)?.graph ?? null, plan.id);
	}

	public parentOf(plan: Plan | null): Plan | null
	{
		return plan?.parentPlanId ? this.planManager.findPlan(plan.parentPlanId) : null;
	}

	public totalBuildsOf(plan: Plan | null): number
	{
		let factor = 1;
		let current = plan;
		const seen = new Set<string>();
		while (current !== null && current.parentPlanId !== null && !seen.has(current.id)) {
			seen.add(current.id);
			factor *= Math.max(1, this.buildsOf(current));
			current = this.planManager.findPlan(current.parentPlanId);
		}
		return factor;
	}

	private countIn(graph: Graph | null, subplanId: string): number
	{
		return (graph?.nodes ?? []).reduce((sum, node) => {
			// Read structurally: the graph may still be raw JSON.
			const raw = node as unknown as {type?: string; subplanId?: string; buildCount?: number};
			if (raw.type !== 'subplan' || raw.subplanId !== subplanId) {
				return sum;
			}
			return sum + Math.max(1, Math.round(raw.buildCount ?? 1));
		}, 0);
	}

}
