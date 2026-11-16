import {Injectable} from '@angular/core';
import {ExtraPowerResolver} from '@src/Model/Planner/ExtraPowerResolver';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SettingsGroups} from '@src/Model/Planner/SettingsGroups';

/** Read structurally: stored graphs may be raw JSON or revived nodes. */
interface RawNode
{
	readonly type?: string;
	readonly amount?: number;
	readonly itemClassName?: string;
	readonly item?: {className?: string};
	readonly subplanId?: string;
	readonly buildCount?: number;
	readonly idle?: boolean;
	readonly groups?: readonly {machines?: number; sloops?: number}[];
}

/**
 * A subplan that shares its parent's resources or sloops draws from the parent's budget: the parent's calculation counts what
 * the subplan uses, and the subplan's own calculation gets what is left of the parent's budget, split over its builds.
 */
@Injectable({providedIn: 'root'})
export class SubplanSharingService
{

	public constructor(
		private readonly planManager: PlanManager,
		private readonly extraPower: ExtraPowerResolver,
	)
	{
	}

	public sharesResources(plan: Plan): boolean
	{
		return this.parentOf(plan) !== null && SettingsGroups.parentGroupsOf(plan).includes('resources');
	}

	public sharesSloops(plan: Plan): boolean
	{
		return this.parentOf(plan) !== null && SettingsGroups.parentGroupsOf(plan).includes('sloops');
	}

	public parentOf(plan: Plan): Plan | null
	{
		return plan.parentPlanId === null ? null : this.planManager.findPlan(plan.parentPlanId);
	}

	/** The plan whose resource budget this plan draws from: itself unless it shares its parent's. */
	public resourceRootOf(plan: Plan): Plan
	{
		let current = plan;
		const seen = new Set<string>();
		while (this.sharesResources(current) && !seen.has(current.id)) {
			seen.add(current.id);
			current = this.parentOf(current)!;
		}
		return current;
	}

	/** The plan and every subplan below it that draws from its resource budget. */
	public resourceTreeIds(plan: Plan): Set<string>
	{
		const ids = new Set<string>([plan.id]);
		const visit = (parentId: string): void => this.planManager.subplansOf(parentId)
			.filter(child => child.parentPlanId === parentId && this.sharesResources(child) && !ids.has(child.id))
			.forEach(child => {
				ids.add(child.id);
				visit(child.id);
			});
		visit(plan.id);
		return ids;
	}

	/** One build of the subplan: its own mines and those of the subplans that share its budget. */
	public sharedMines(plan: Plan, seen: ReadonlySet<string> = new Set()): Map<string, number>
	{
		const usage = this.ownMines(plan.graph);
		if (seen.has(plan.id)) {
			return usage;
		}
		const path = new Set([...seen, plan.id]);
		this.subplanNodes(plan.graph).forEach(node => {
			const child = this.planManager.findPlan(node.subplanId!);
			if (child === null || child.parentPlanId !== plan.id || !this.sharesResources(child)) {
				return;
			}
			const builds = this.buildsOfNode(node);
			this.sharedMines(child, path).forEach((amount, className) => usage.set(className, (usage.get(className) ?? 0) + amount * builds));
		});
		return usage;
	}

	/** One build of the subplan: the sloops in its machines and augmenters, and those of the subplans that share its budget. */
	public sharedSloops(plan: Plan, seen: ReadonlySet<string> = new Set()): number
	{
		let total = this.ownSloops(plan);
		if (seen.has(plan.id)) {
			return total;
		}
		const path = new Set([...seen, plan.id]);
		this.subplanNodes(plan.graph).forEach(node => {
			const child = this.planManager.findPlan(node.subplanId!);
			if (child !== null && child.parentPlanId === plan.id && this.sharesSloops(child)) {
				total += this.sharedSloops(child, path) * this.buildsOfNode(node);
			}
		});
		return total;
	}

	/** What is left of the parent's limits once the parent and the other subplans have taken theirs, per build of this subplan. */
	public limitsFromParent(plan: Plan, parentLimits: Record<string, number>): Record<string, number>
	{
		const parent = this.parentOf(plan)!;
		const used = this.parentUsageBesides(parent, plan.id, (child, builds, usage) =>
			this.sharedMines(child).forEach((amount, className) => usage.set(className, (usage.get(className) ?? 0) + amount * builds)));
		const builds = this.buildsIn(parent, plan.id);
		const limits: Record<string, number> = {};
		Object.entries(parentLimits).forEach(([className, limit]) => {
			limits[className] = Math.max(0, limit - (used.get(className) ?? 0)) / builds;
		});
		return limits;
	}

	public sloopsFromParent(plan: Plan, parentBudget: number): number
	{
		const parent = this.parentOf(plan)!;
		let used = this.ownSloops(parent);
		this.subplanNodes(parent.graph).forEach(node => {
			const child = this.planManager.findPlan(node.subplanId!);
			if (child !== null && child.id !== plan.id && child.parentPlanId === parent.id && this.sharesSloops(child)) {
				used += this.sharedSloops(child) * this.buildsOfNode(node);
			}
		});
		return Math.max(0, Math.floor((parentBudget - used) / this.buildsIn(parent, plan.id)));
	}

	/** At least one: an idle or unplaced subplan is still calculated as one build. */
	public buildsIn(parent: Plan, subplanId: string): number
	{
		const builds = this.subplanNodes(parent.graph)
			.filter(node => node.subplanId === subplanId)
			.reduce((sum, node) => sum + this.buildsOfNode(node), 0);
		return Math.max(1, builds);
	}

	private parentUsageBesides(
		parent: Plan,
		subplanId: string,
		addChild: (child: Plan, builds: number, usage: Map<string, number>) => void,
	): Map<string, number>
	{
		const usage = this.ownMines(parent.graph);
		this.subplanNodes(parent.graph).forEach(node => {
			const child = this.planManager.findPlan(node.subplanId!);
			if (child !== null && child.id !== subplanId && child.parentPlanId === parent.id && this.sharesResources(child)) {
				addChild(child, this.buildsOfNode(node), usage);
			}
		});
		return usage;
	}

	private ownMines(graph: Graph | null): Map<string, number>
	{
		const usage = new Map<string, number>();
		this.rawNodes(graph).forEach(node => {
			const className = node.itemClassName ?? node.item?.className;
			if (node.type === 'mine' && className !== undefined && typeof node.amount === 'number') {
				usage.set(className, (usage.get(className) ?? 0) + node.amount);
			}
		});
		return usage;
	}

	private ownSloops(plan: Plan): number
	{
		const machines = this.rawNodes(plan.graph)
			.filter(node => node.type === 'recipe')
			.reduce((sum, node) => sum + (node.groups ?? []).reduce((groupSum, group) => groupSum + (group.machines ?? 0) * (group.sloops ?? 0), 0), 0);
		return machines + this.extraPower.resolve(plan.settings).sloopCost;
	}

	private subplanNodes(graph: Graph | null): RawNode[]
	{
		return this.rawNodes(graph).filter(node => node.type === 'subplan' && node.subplanId !== undefined);
	}

	private buildsOfNode(node: RawNode): number
	{
		return node.idle === true ? 0 : Math.max(1, Math.round(node.buildCount ?? 1));
	}

	private rawNodes(graph: Graph | null): RawNode[]
	{
		return (graph?.nodes ?? []) as unknown as RawNode[];
	}

}
