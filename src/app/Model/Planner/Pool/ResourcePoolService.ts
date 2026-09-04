import {Injectable} from '@angular/core';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PoolResourceStatus} from '@src/Model/Planner/Pool/PoolResourceStatus';

/**
 * The shared raw-resource pool of a folder whose Resources group is pooled:
 * the folder's limits are one budget for every inner plan, and a plan may
 * only mine what the others have left. Usage comes from the mine nodes of
 * each plan's stored graph - locked and hand-edited mines included - so the
 * pool reflects what the plans actually extract, not what they were allowed.
 */
@Injectable({providedIn: 'root'})
export class ResourcePoolService
{

	/** Usage beyond this fraction of a unit counts as over the share, not float noise. */
	private static readonly EPSILON = 1e-6;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
	)
	{
	}

	/**
	 * The raw-resource caps the solver must respect for this plan: its own
	 * limits, reduced by the other inner plans' extraction when pooled, and
	 * zero for every resource switched off. A plan variant without limits and
	 * disabled resources stays unlimited (the failure diagnosis relies on that).
	 */
	public effectiveLimits(plan: Plan): Record<string, number>
	{
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

	/** Name of the folder pooling the plan's resources, or null. */
	public poolFolderName(plan: Plan): string | null
	{
		return this.planManager.poolFolderOf(plan)?.name ?? null;
	}

	/** Per-resource pool figures for the plan, or null when the plan's resources are not pooled. */
	public status(plan: Plan): PoolResourceStatus[] | null
	{
		const folder = this.planManager.poolFolderOf(plan);
		const data = this.versionManager.activeVersionData();
		if (folder === null || data === null) {
			return null;
		}
		const limits = folder.settings?.resourceLimits ?? {};
		const disabled = new Set(folder.settings?.disabledResources ?? []);
		const others = this.usageByOthers(folder, plan);
		const own = this.mineUsage(plan);

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

	/** Total extraction per resource across every plan inside the folder (the folder's pool view). */
	public usageInFolder(folderId: string): Map<string, number>
	{
		const total = new Map<string, number>();
		this.planManager.innerPlans(folderId).forEach(plan => this.mineUsage(plan).forEach((amount, className) => {
			total.set(className, (total.get(className) ?? 0) + amount);
		}));
		return total;
	}

	/** The pooled resources this plan mines beyond its available share. */
	public overUsed(plan: Plan): PoolResourceStatus[]
	{
		return (this.status(plan) ?? []).filter(status => status.overUse);
	}

	private usageByOthers(folder: Folder, plan: Plan): Map<string, number>
	{
		const total = new Map<string, number>();
		this.planManager.innerPlans(folder.id)
			.filter(other => other.id !== plan.id)
			.forEach(other => this.mineUsage(other).forEach((amount, className) => {
				total.set(className, (total.get(className) ?? 0) + amount);
			}));
		return total;
	}

	/**
	 * Per-resource extraction of the plan's stored graph. Stored graphs are
	 * either revived node instances or raw JSON straight from storage - both
	 * carry the type, and the item is reachable either way.
	 */
	private mineUsage(plan: Plan): Map<string, number>
	{
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
			usage.set(className, (usage.get(className) ?? 0) + raw.amount);
		});
		return usage;
	}

}
