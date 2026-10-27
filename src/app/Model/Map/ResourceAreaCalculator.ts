import {Injectable} from '@angular/core';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {PurityCounts} from '@src/Model/API/Schema/World/PurityCounts';
import {WorldNodesSchema} from '@src/Model/API/Schema/World/WorldNodesSchema';
import {Data} from '@src/Model/Data/Data';
import {WorldLimitsCalculator} from '@src/Model/Data/WorldLimitsCalculator';
import {ConveyorTiers} from '@src/Model/Map/ConveyorTiers';
import {MapAreaGeometry} from '@src/Model/Map/MapAreaGeometry';
import {MapMarkerBuilder} from '@src/Model/Map/MapMarkerBuilder';
import {MapPlanDefaults} from '@src/Model/Map/MapPlanDefaults';
import {ResourceAreaRow} from '@src/Model/Map/ResourceAreaRow';
import {ResourceAreaSummary} from '@src/Model/Map/ResourceAreaSummary';
import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';
import {MapConveyors} from '@src/Model/Planner/MapConveyors';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ResourceArea} from '@src/Model/Planner/ResourceArea';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';

@Injectable({providedIn: 'root'})
export class ResourceAreaCalculator
{

	public constructor(private readonly limits: WorldLimitsCalculator)
	{
	}

	/** Taken nodes, those with an extractor already on them in the game, count for nothing. */
	public summary(area: ResourceArea, conveyors: MapConveyors, world: WorldNodesSchema, data: Data, taken: ReadonlySet<string>): ResourceAreaSummary
	{
		const nodes = new Map<string, PurityCounts>();
		const satellites = new Map<string, PurityCounts>();
		let nodeCount = 0;
		let takenCount = 0;
		for (const node of world.resourceNodes) {
			const counts = this.counts(nodes, node.resource);
			if (!MapAreaGeometry.contains(area.points, node.location[0], node.location[1])) {
				continue;
			}
			if (taken.has(node.name)) {
				takenCount++;
			} else {
				counts[MapMarkerBuilder.purity(node.purity)]++;
				nodeCount++;
			}
		}
		for (const core of world.frackingCores) {
			const counts = this.counts(satellites, core.resource);
			for (const satellite of core.satellites) {
				if (!MapAreaGeometry.contains(area.points, satellite.location[0], satellite.location[1])) {
					continue;
				}
				if (taken.has(satellite.name)) {
					takenCount++;
				} else {
					counts[MapMarkerBuilder.purity(satellite.purity)]++;
					nodeCount++;
				}
			}
		}

		const geysers = this.freeGeysers(world, taken, area);
		takenCount += world.geysers.filter(geyser => taken.has(geyser.name) && MapAreaGeometry.contains(area.points, geyser.location[0], geyser.location[1])).length;

		const beltCap = ConveyorTiers.belt(conveyors.beltMark);
		const pipeCap = ConveyorTiers.pipe(conveyors.pipeMark);
		const limits = new Map<string, number | null>();
		const rows: ResourceAreaRow[] = [];
		for (const className of new Set([...nodes.keys(), ...satellites.keys()])) {
			const item = data.searchItemByClassName(className) ?? null;
			const nodeCounts = nodes.get(className) ?? null;
			const satelliteCounts = satellites.get(className) ?? null;
			const limit = className === SpecialClasses.WaterItem && !area.waterWells
				? null
				: this.limits.rowLimit(nodeCounts, satelliteCounts, (item?.form ?? ItemForm.Solid) === ItemForm.Solid, beltCap, pipeCap);
			limits.set(className, limit);

			const counts = this.sum(nodeCounts, satelliteCounts);
			if (limit === null || counts.impure + counts.normal + counts.pure > 0) {
				rows.push({className, name: item?.name ?? className, counts, limit});
			}
		}
		rows.sort((a, b) => a.name.localeCompare(b.name));
		return {rows, limits, nodeCount, takenCount, geysers};
	}

	/** The settings' own area counted again, after its conveyors or taken nodes changed. */
	public recount(settings: PlanSettings, world: WorldNodesSchema, data: Data, taken: ReadonlySet<string>): PlanSettings
	{
		const area = settings.resourceArea;
		if (area === undefined) {
			return settings;
		}
		const summary = this.summary(area, settings.mapConveyors ?? MapPlanDefaults.CONVEYORS, world, data, taken);
		return this.apply(settings, area, summary);
	}

	/** Free geysers in the area, or anywhere without one. */
	public freeGeysers(world: WorldNodesSchema, taken: ReadonlySet<string>, area: ResourceArea | null = null): PurityCounts
	{
		const geysers: PurityCounts = {impure: 0, normal: 0, pure: 0};
		for (const geyser of world.geysers) {
			if (!taken.has(geyser.name) && (area === null || MapAreaGeometry.contains(area.points, geyser.location[0], geyser.location[1]))) {
				geysers[MapMarkerBuilder.purity(geyser.purity)]++;
			}
		}
		return geysers;
	}

	/** Resources the world has no nodes of keep whatever limit they had. Geothermal generators beyond the area's free geysers are dropped. */
	public apply(settings: PlanSettings, area: ResourceArea, summary: ResourceAreaSummary): PlanSettings
	{
		const limits: Record<string, number> = {...settings.resourceLimits ?? {}};
		for (const [className, limit] of summary.limits) {
			if (limit === null) {
				delete limits[className];
			} else {
				limits[className] = limit;
			}
		}
		return {
			...settings,
			resourceLimits: Object.keys(limits).length > 0 ? limits : undefined,
			resourceArea: area,
			geothermalGenerators: this.capGeysers(settings.geothermalGenerators, summary.geysers),
		};
	}

	public capGeysers(generators: GeothermalGenerators | undefined, free: PurityCounts): GeothermalGenerators | undefined
	{
		if (generators === undefined) {
			return undefined;
		}
		const capped = {
			impure: Math.min(generators.impure, free.impure),
			normal: Math.min(generators.normal, free.normal),
			pure: Math.min(generators.pure, free.pure),
		};
		return capped.impure + capped.normal + capped.pure > 0 ? capped : undefined;
	}

	private counts(map: Map<string, PurityCounts>, className: string): PurityCounts
	{
		let counts = map.get(className);
		if (counts === undefined) {
			counts = {impure: 0, normal: 0, pure: 0};
			map.set(className, counts);
		}
		return counts;
	}

	private sum(a: PurityCounts | null, b: PurityCounts | null): PurityCounts
	{
		return {
			impure: (a?.impure ?? 0) + (b?.impure ?? 0),
			normal: (a?.normal ?? 0) + (b?.normal ?? 0),
			pure: (a?.pure ?? 0) + (b?.pure ?? 0),
		};
	}

}
