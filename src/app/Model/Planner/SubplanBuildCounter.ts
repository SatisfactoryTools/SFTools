import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/**
 * Counts how many times a subplan is built by its parent - the build counts
 * of every node in the parent that points at it, added up. Reads the parent's
 * graph in whichever shape it is stored (hydrated or raw JSON), so no graph
 * revival is needed just to show the number.
 */
@Injectable({providedIn: 'root'})
export class SubplanBuildCounter
{

	public constructor(
		private readonly planManager: PlanManager,
	)
	{
	}

	/** Zero for a plan that is not a subplan, or whose parent no longer places it. */
	public buildsOf(plan: Plan | null): number
	{
		if (!plan?.parentPlanId) {
			return 0;
		}
		return this.countIn(this.planManager.findPlan(plan.parentPlanId)?.graph ?? null, plan.id);
	}

	/** The parent plan a subplan is built in, if it still exists. */
	public parentOf(plan: Plan | null): Plan | null
	{
		return plan?.parentPlanId ? this.planManager.findPlan(plan.parentPlanId) : null;
	}

	/**
	 * How many times the plan is built inside its top-level plan: the build
	 * counts of the whole chain of subplan nodes above it, multiplied
	 * together. One for a top-level plan, and for a subplan its parent does
	 * not place (a parent that has no graph yet).
	 */
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
			// Raw JSON nodes carry the same fields as the hydrated ones.
			const raw = node as unknown as {type?: string; subplanId?: string; buildCount?: number};
			if (raw.type !== 'subplan' || raw.subplanId !== subplanId) {
				return sum;
			}
			return sum + Math.max(1, Math.round(raw.buildCount ?? 1));
		}, 0);
	}

}
