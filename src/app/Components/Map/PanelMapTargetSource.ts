import {computed, Injectable, Signal} from '@angular/core';
import {MapTargetSource} from '@src/Components/Map/MapTargetSource';
import {MapTarget} from '@src/Model/Map/MapTarget';
import {PlanManager} from '@src/Model/Planner/PlanManager';

@Injectable()
export class PanelMapTargetSource extends MapTargetSource
{

	public readonly selectable = false;

	public readonly target: Signal<MapTarget | null> = computed(() => {
		const plan = this.planManager.activePlan();
		if (plan !== null) {
			return MapTarget.ofPlan(plan);
		}
		const folder = this.planManager.activeFolder();
		return folder === null ? null : MapTarget.ofFolder(folder);
	});

	public constructor(private readonly planManager: PlanManager)
	{
		super();
	}

}
