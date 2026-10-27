import {computed, Injectable, Signal} from '@angular/core';
import {MapPlanSettingsService} from '@src/Components/Map/MapPlanSettingsService';
import {MapMarkerBuilder} from '@src/Model/Map/MapMarkerBuilder';
import {ExtraPowerResolver} from '@src/Model/Planner/ExtraPowerResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {ResourcePoolService} from '@src/Model/Planner/Pool/ResourcePoolService';

/** What the target plan or folder mines, for the map's "only what the plan uses" filter. */
@Injectable()
export class MapUsedResources
{

	private static readonly EPSILON = 1e-6;

	/** Resource keys as the node markers group them; null without a calculated plan to ask. */
	public readonly usedKeys: Signal<ReadonlySet<string> | null> = computed(() => {
		const target = this.planSettings.target();
		if (target === null) {
			return null;
		}
		const plans = target.plan !== null ? [target.plan] : this.planManager.innerPlans(target.folder!.id);
		if (!plans.some(plan => plan.graph !== null)) {
			return null;
		}
		const usage = target.plan !== null ? this.pool.usageOfPlan(target.plan) : this.pool.usageInFolder(target.folder!.id);
		const keys = new Set([...usage].filter(([, amount]) => amount > MapUsedResources.EPSILON).map(([className]) => MapMarkerBuilder.resourceKey(className)));
		if (plans.some(plan => this.extraPower.resolve(plan.settings).geothermalCount > 0)) {
			keys.add(MapMarkerBuilder.GEYSER);
		}
		return keys;
	});

	public constructor(
		private readonly planSettings: MapPlanSettingsService,
		private readonly planManager: PlanManager,
		private readonly pool: ResourcePoolService,
		private readonly extraPower: ExtraPowerResolver,
	)
	{
	}

}
