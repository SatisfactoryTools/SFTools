import {computed, Injectable} from '@angular/core';
import {ExtraPowerResolver} from '@src/Model/Planner/ExtraPowerResolver';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {GameManager} from '@src/Model/Game/GameManager';
import {GeyserCap} from '@src/Model/Game/GeyserCap';
import {ResourceAreaCalculator} from '@src/Model/Map/ResourceAreaCalculator';
import {WorldNodesManager} from '@src/Model/Map/WorldNodesManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';

/** How many geothermal generators a plan can have: the free geysers in its area, else in the whole world. */
@Injectable({providedIn: 'root'})
export class GeyserCaps
{

	private readonly takenGeysers = computed(() => {
		const taken = this.games.taken();
		return this.worldNodes.nodes()?.geysers.filter(geyser => taken.has(geyser.name)).length ?? 0;
	});

	public constructor(
		private readonly worldNodes: WorldNodesManager,
		private readonly games: GameManager,
		private readonly calculator: ResourceAreaCalculator,
		private readonly extraPower: ExtraPowerResolver,
		private readonly versionManager: VersionManager,
	)
	{
	}

	public cap(settings: PlanSettings | null | undefined): GeyserCap | null
	{
		const world = this.worldNodes.nodes();
		if (world === null) {
			const counts = this.extraPower.availableGeysers(this.versionManager.activeVersion());
			return counts === null ? null : {counts, source: 'version', taken: 0};
		}
		const area = settings?.resourceArea ?? null;
		return {
			counts: this.calculator.freeGeysers(world, this.games.taken(), area),
			source: area !== null ? 'area' : 'world',
			taken: this.takenGeysers(),
		};
	}

}
