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
			const placed = this.placedIn(this.planManager.findPlan(current.parentPlanId)?.graph ?? null, current.id);
			// An unplaced subplan still counts once; one whose every node is idle is not built at all.
			factor *= placed ? this.buildsOf(current) : 1;
			current = this.planManager.findPlan(current.parentPlanId);
		}
		return factor;
	}

	private countIn(graph: Graph | null, subplanId: string): number
	{
		return (graph?.nodes ?? []).reduce((sum, node) => {
			// Read structurally: the graph may still be raw JSON.
			const raw = node as unknown as {type?: string; subplanId?: string; buildCount?: number; idle?: boolean};
			if (raw.type !== 'subplan' || raw.subplanId !== subplanId || raw.idle === true) {
				return sum;
			}
			return sum + Math.max(1, Math.round(raw.buildCount ?? 1));
		}, 0);
	}

	private placedIn(graph: Graph | null, subplanId: string): boolean
	{
		return (graph?.nodes ?? []).some(node => {
			const raw = node as unknown as {type?: string; subplanId?: string};
			return raw.type === 'subplan' && raw.subplanId === subplanId;
		});
	}

}
