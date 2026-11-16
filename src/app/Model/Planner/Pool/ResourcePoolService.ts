import {Injectable} from '@angular/core';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PoolResourceStatus} from '@src/Model/Planner/Pool/PoolResourceStatus';
import {SubplanBuildCounter} from '@src/Model/Planner/SubplanBuildCounter';
import {SubplanSharingService} from '@src/Model/Planner/Pool/SubplanSharingService';

@Injectable({providedIn: 'root'})
export class ResourcePoolService
{

	private static readonly EPSILON = 1e-6;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly subplanBuildCounter: SubplanBuildCounter,
		private readonly sharing: SubplanSharingService,
	)
	{
	}

	/** A subplan sharing its parent's resources gets what the parent leaves; the parent's own calculation counts the subplan's mining. */
	public effectiveLimits(plan: Plan, seen: ReadonlySet<string> = new Set()): Record<string, number>
	{
		const parent = this.sharing.parentOf(plan);
		if (parent !== null && this.sharing.sharesResources(plan) && !seen.has(parent.id)) {
			const limits = this.sharing.limitsFromParent(plan, this.effectiveLimits(parent, new Set([...seen, plan.id])));
			(plan.settings.disabledResources ?? []).forEach(className => {
				limits[className] = 0;
			});
			return limits;
		}
		const own = plan.settings.resourceLimits ?? {};
		const folder = this.planManager.poolFolderOf(plan);
		const others = folder === null ? new Map<string, number>() : this.usageByOthers(folder, plan);
		const limits: Record<string, number> = {};
		Object.entries(own).forEach(([className, limit]) => {
			limits[className] = Math.max(0, limit - (others.get(className) ?? 0));
		});
		(plan.settings.disabledResources ?? []).forEach(className => {
			limits[className] = 0;
		});
		return limits;
	}

	public poolFolderName(plan: Plan): string | null
	{
		return this.planManager.poolFolderOf(plan)?.name ?? null;
	}

	/** Null for a subplan that shares its parent's resources: the parent's figures cover it. */
	public status(plan: Plan): PoolResourceStatus[] | null
	{
		const folder = this.planManager.poolFolderOf(plan);
		const data = this.versionManager.activeVersionData();
		if (folder === null || data === null || this.sharing.sharesResources(plan)) {
			return null;
		}
		const limits = folder.settings?.resourceLimits ?? {};
		const disabled = new Set(folder.settings?.disabledResources ?? []);
		const others = this.usageByOthers(folder, plan);
		const builds = this.subplanBuildCounter.totalBuildsOf(plan);
		const own = new Map([...this.sharing.sharedMines(plan)].map(([className, amount]) => [className, amount * builds]));

		return data.resources
			.map(className => data.searchItemByClassName(className))
			.filter((item): item is Item => item !== undefined)
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(item => {
				const limit = limits[item.className] ?? null;
				const usedByOthers = others.get(item.className) ?? 0;
				const usedByPlan = own.get(item.className) ?? 0;
				const available = limit === null ? null : Math.max(0, limit - usedByOthers);
				return {
					item,
					limit,
					disabled: disabled.has(item.className),
					usedByOthers,
					usedByPlan,
					available,
					overUse: available !== null && usedByPlan - available > ResourcePoolService.EPSILON,
				};
			});
	}

	public usageInFolder(folderId: string): Map<string, number>
	{
		const total = new Map<string, number>();
		this.planManager.innerPlans(folderId).forEach(plan => this.mineUsage(plan).forEach((amount, className) => {
			total.set(className, (total.get(className) ?? 0) + amount);
		}));
		return total;
	}

	/** The plan's mining, its subplans' included. */
	public usageOfPlan(plan: Plan): Map<string, number>
	{
		const total = new Map<string, number>();
		[plan, ...this.planManager.subplansOf(plan.id)].forEach(entry => this.mineUsage(entry).forEach((amount, className) => {
			total.set(className, (total.get(className) ?? 0) + amount);
		}));
		return total;
	}

	public overUsed(plan: Plan): PoolResourceStatus[]
	{
		return (this.status(plan) ?? []).filter(status => status.overUse);
	}

	/** The subplans sharing the plan's budget are not others: the plan's own calculation counts them. */
	private usageByOthers(folder: Folder, plan: Plan): Map<string, number>
	{
		const total = new Map<string, number>();
		const tree = this.sharing.resourceTreeIds(plan);
		this.planManager.innerPlans(folder.id)
			.filter(other => !tree.has(other.id))
			.forEach(other => this.mineUsage(other).forEach((amount, className) => {
				total.set(className, (total.get(className) ?? 0) + amount);
			}));
		return total;
	}

	/** Stored graphs are revived node instances or raw JSON straight from storage, hence the duck typing. */
	private mineUsage(plan: Plan): Map<string, number>
	{
		const builds = this.subplanBuildCounter.totalBuildsOf(plan);
		const usage = new Map<string, number>();
		(plan.graph?.nodes ?? []).forEach(node => {
			const raw = node as unknown as {type?: string; amount?: number; itemClassName?: string; item?: {className?: string}};
			if (raw.type !== 'mine') {
				return;
			}
			const className = raw.itemClassName ?? raw.item?.className;
			if (className === undefined || typeof raw.amount !== 'number') {
				return;
			}
			usage.set(className, (usage.get(className) ?? 0) + raw.amount * builds);
		});
		return usage;
	}

}
