import {computed, Injectable, Signal} from '@angular/core';
import {MapMarkerSource} from '@src/Components/Map/MapMarkerSource';
import {MapPlanSettingsService} from '@src/Components/Map/MapPlanSettingsService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {GameManager} from '@src/Model/Game/GameManager';
import {MapTarget} from '@src/Model/Map/MapTarget';
import {ResourceAreaCalculator} from '@src/Model/Map/ResourceAreaCalculator';
import {ResourceAreaSummary} from '@src/Model/Map/ResourceAreaSummary';
import {MapConveyors} from '@src/Model/Planner/MapConveyors';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ResourceArea} from '@src/Model/Planner/ResourceArea';

@Injectable()
export class MapResourceAreaService
{

	public readonly target: Signal<MapTarget | null> = computed(() => this.planSettings.target());

	public readonly area: Signal<ResourceArea | null> = computed(() => this.target()?.settings?.resourceArea ?? null);

	public readonly summary: Signal<ResourceAreaSummary | null> = computed(() => {
		const area = this.area();
		const world = this.markers.worldNodes();
		const data = this.versionManager.activeVersionData();
		return area === null || world === null || data === null
			? null
			: this.calculator.summary(area, this.planSettings.conveyors(), world, data, this.games.taken());
	});

	/** Why the limits cannot be changed from here; null when they can. */
	public readonly blocker: Signal<string | null> = computed(() => this.planSettings.resourcesBlocker());

	public constructor(
		private readonly planSettings: MapPlanSettingsService,
		private readonly markers: MapMarkerSource,
		private readonly versionManager: VersionManager,
		private readonly calculator: ResourceAreaCalculator,
		private readonly games: GameManager,
	)
	{
	}

	/** A redrawn area keeps the water choice of the one it replaces. */
	public draw(points: [number, number][]): boolean
	{
		return this.save({
			points: points.map(([x, y]) => [Math.round(x), Math.round(y)]),
			waterWells: this.area()?.waterWells ?? false,
		}, this.planSettings.conveyors());
	}

	public setWaterWells(waterWells: boolean): void
	{
		const area = this.area();
		if (area !== null) {
			this.save({...area, waterWells}, this.planSettings.conveyors());
		}
	}

	/** Faster conveyors raise what every node gives: an area's limits are counted again with them. */
	public setConveyors(conveyors: MapConveyors): void
	{
		const area = this.area();
		if (area !== null) {
			this.save(area, conveyors);
		} else {
			this.planSettings.update(settings => ({...settings, mapConveyors: conveyors}), true);
		}
	}

	/** The limits stay: they are the plan's own now. */
	public remove(): void
	{
		this.planSettings.update(settings => ({...settings, resourceArea: undefined}), true);
	}

	private save(area: ResourceArea, conveyors: MapConveyors): boolean
	{
		return this.recounted(settings => ({...settings, resourceArea: area, mapConveyors: conveyors}));
	}

	private recounted(change: (settings: PlanSettings) => PlanSettings): boolean
	{
		const world = this.markers.worldNodes();
		const data = this.versionManager.activeVersionData();
		if (world === null || data === null) {
			return false;
		}
		return this.planSettings.update(settings => this.calculator.recount(change(settings), world, data, this.games.taken()), true);
	}

}
