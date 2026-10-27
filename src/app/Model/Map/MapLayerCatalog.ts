import {Injectable} from '@angular/core';
import {CollectibleCatalog} from '@src/Model/Map/CollectibleCatalog';
import {MapCategory} from '@src/Model/Map/MapCategory';
import {MapCategoryGroup} from '@src/Model/Map/MapCategoryGroup';
import {MapCategoryPurity} from '@src/Model/Map/MapCategoryPurity';
import {MapLayer} from '@src/Model/Map/MapLayer';
import {MapLayerId} from '@src/Model/Map/MapLayerId';
import {MapMarker} from '@src/Model/Map/MapMarker';
import {MapMarkerBuilder} from '@src/Model/Map/MapMarkerBuilder';
import {MapPurity} from '@src/Model/Map/MapPurity';
import {MapPurityColumn} from '@src/Model/Map/MapPurityColumn';

@Injectable({providedIn: 'root'})
export class MapLayerCatalog
{

	public static readonly COLLECTIBLE_LAYERS: ReadonlyArray<MapLayerId> = ['slugs', 'artifacts', 'drives', 'plants', 'items', 'creatures'];

	private static readonly LABELS: Record<MapLayerId, string> = {
		nodes: 'Resource nodes',
		slugs: 'Power slugs',
		artifacts: 'Somersloops & Mercer Spheres',
		drives: 'Crash sites',
		plants: 'Plants',
		items: 'Items on the ground',
		creatures: 'Creatures',
		area: 'Resource area',
		sites: 'Location viability',
		taken: 'Taken nodes',
		players: 'Players',
		collected: 'Collected items',
		spots: 'Factory locations',
		clusters: 'Group when zoomed out',
		usedOnly: 'Only what the plan uses',
		spotLinks: 'Links to the closest nodes',
	};

	private static readonly PURITIES: ReadonlyArray<MapPurity> = ['impure', 'normal', 'pure'];

	public constructor(private readonly builder: MapMarkerBuilder)
	{
	}

	public area(nodeCount: number | null): MapLayer
	{
		return new MapLayer('area', MapLayerCatalog.LABELS.area, nodeCount, []);
	}

	public sites(loading: boolean): MapLayer
	{
		return new MapLayer('sites', MapLayerCatalog.LABELS.sites, null, [], loading);
	}

	public taken(count: number): MapLayer
	{
		return new MapLayer('taken', MapLayerCatalog.LABELS.taken, count, [], false);
	}

	public players(count: number): MapLayer
	{
		return new MapLayer('players', MapLayerCatalog.LABELS.players, count, [], false);
	}

	public collected(count: number): MapLayer
	{
		return new MapLayer('collected', MapLayerCatalog.LABELS.collected, count, [], false);
	}

	public spots(count: number): MapLayer
	{
		return new MapLayer('spots', MapLayerCatalog.LABELS.spots, count, [], false);
	}

	public build(nodes: MapMarker[] | null, collectibles: MapMarker[] | null, hasNodes: boolean, hasCollectibles: boolean): MapLayer[]
	{
		const layers: MapLayer[] = [];
		if (hasNodes) {
			layers.push(this.nodeLayer(nodes));
		}
		if (hasCollectibles) {
			for (const id of MapLayerCatalog.COLLECTIBLE_LAYERS) {
				const markers = collectibles?.filter(marker => marker.layer === id) ?? null;
				if (markers !== null && markers.length === 0) {
					continue;
				}
				layers.push(new MapLayer(id, MapLayerCatalog.LABELS[id], markers?.length ?? null, markers === null ? [] : this.collectibleGroups(markers)));
			}
		}
		return layers;
	}

	private nodeLayer(markers: MapMarker[] | null): MapLayer
	{
		if (markers === null) {
			return new MapLayer('nodes', MapLayerCatalog.LABELS.nodes, null, []);
		}

		const resources = [...this.groupBy(markers)].map(([key, group]) => {
			const first = group[0];
			const purities = MapLayerCatalog.PURITIES
				.map(purity => new MapCategoryPurity(
					MapMarkerBuilder.nodeCategory(key, purity),
					purity,
					this.builder.purityLabel(purity),
					group.filter(marker => marker.purity === purity).length,
				))
				.filter(purity => purity.count > 0);
			return new MapCategory(key, first.groupLabel, first.color, 'normal', first.iconUrl, group.length, purities.map(purity => purity.id), purities);
		}).sort((a, b) => {
			if ((a.key === MapMarkerBuilder.GEYSER) !== (b.key === MapMarkerBuilder.GEYSER)) {
				return a.key === MapMarkerBuilder.GEYSER ? 1 : -1;
			}
			return a.label.localeCompare(b.label);
		});

		// A world without some purity (all-pure random worlds) gets no column for it.
		const columns = MapLayerCatalog.PURITIES
			.map(purity => new MapPurityColumn(
				purity,
				this.builder.purityLabel(purity),
				resources.flatMap(resource => resource.purities.filter(entry => entry.purity === purity).map(entry => entry.id)),
				markers.filter(marker => marker.purity === purity).length,
			))
			.filter(column => column.count > 0);

		return new MapLayer('nodes', MapLayerCatalog.LABELS.nodes, markers.length, [
			new MapCategoryGroup('Resources', resources, columns),
		]);
	}

	private collectibleGroups(markers: MapMarker[]): MapCategoryGroup[]
	{
		const categories = [...this.groupBy(markers)]
			.map(([key, group]) => {
				const first = group[0];
				const collected = group.filter(marker => marker.collected).length;
				return {section: first.section, category: new MapCategory(key, first.groupLabel, first.color, 'circle', first.iconUrl, group.length, [key], [], collected)};
			})
			.sort((a, b) => CollectibleCatalog.CATEGORY_ORDER.indexOf(a.category.key) - CollectibleCatalog.CATEGORY_ORDER.indexOf(b.category.key));
		if (categories.length < 2) {
			return [];
		}

		return CollectibleCatalog.SECTION_ORDER
			.map(section => new MapCategoryGroup(section, categories.filter(entry => entry.section === section).map(entry => entry.category)))
			.filter(group => group.categories.length > 0);
	}

	private groupBy(markers: MapMarker[]): Map<string, MapMarker[]>
	{
		const groups = new Map<string, MapMarker[]>();
		for (const marker of markers) {
			if (marker.groupKey === null) {
				continue;
			}
			const group = groups.get(marker.groupKey);
			if (group === undefined) {
				groups.set(marker.groupKey, [marker]);
			} else {
				group.push(marker);
			}
		}
		return groups;
	}

}
