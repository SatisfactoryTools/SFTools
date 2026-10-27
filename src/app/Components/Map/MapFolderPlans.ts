import {computed, Injectable, Signal} from '@angular/core';
import {MapPlanSettingsService} from '@src/Components/Map/MapPlanSettingsService';
import {MapFolderPlan} from '@src/Model/Map/MapFolderPlan';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';

/** A folder on the map shows every plan in it: their areas and factory spots, each in its own colour. */
@Injectable()
export class MapFolderPlans
{

	/** Apart from the area's orange, and from each other on the map's greens and browns. */
	private static readonly COLORS = ['#5bc0de', '#d9a6ff', '#9be15d', '#ff7eb6', '#ffd43b', '#66d9e8', '#c0a080', '#ff6b6b'];

	public readonly plans: Signal<MapFolderPlan[]> = computed(() => {
		const folder = this.planSettings.target()?.folder ?? null;
		if (folder === null) {
			return [];
		}
		// A folder that fixes the resources pushes its own area to every plan: drawn once, as the folder's.
		const own = JSON.stringify(this.planSettings.settings()?.resourceArea?.points ?? null);
		return this.planManager.innerPlans(folder.id)
			.filter(plan => plan.parentPlanId === null)
			.map((plan, index) => {
				const points = plan.settings.resourceArea?.points ?? null;
				return {
					id: plan.id,
					name: this.names.displayName(plan),
					iconHash: this.icons.iconHash(plan),
					color: MapFolderPlans.COLORS[index % MapFolderPlans.COLORS.length],
					area: points !== null && JSON.stringify(points) !== own ? points : null,
					spot: plan.settings.factorySpot ?? null,
				};
			});
	});

	public constructor(
		private readonly planSettings: MapPlanSettingsService,
		private readonly planManager: PlanManager,
		private readonly names: PlanNameResolver,
		private readonly icons: PlanIconResolver,
	)
	{
	}

}
