import {Injectable} from '@angular/core';
import {CollectibleSchema} from '@src/Model/API/Schema/World/CollectibleSchema';
import {CollectiblesSchema} from '@src/Model/API/Schema/World/CollectiblesSchema';
import {WorldNodesSchema} from '@src/Model/API/Schema/World/WorldNodesSchema';
import {Data} from '@src/Model/Data/Data';
import {IconUrlService} from '@src/Model/Data/IconUrlService';
import {CollectibleCatalog} from '@src/Model/Map/CollectibleCatalog';
import {CollectibleKind} from '@src/Model/Map/CollectibleKind';
import {MapBackground} from '@src/Model/Map/MapBackground';
import {MapMarker} from '@src/Model/Map/MapMarker';
import {MapMarkerKind} from '@src/Model/Map/MapMarkerKind';
import {MapPurity} from '@src/Model/Map/MapPurity';
import {MapResourceColors} from '@src/Model/Map/MapResourceColors';
import {GamePlayer} from '@src/Model/Game/GamePlayer';

@Injectable({providedIn: 'root'})
export class MapMarkerBuilder
{

	public static readonly GEYSER = 'geyser';

	private static readonly ARACHNOPHOBIA_SUFFIX = '-arachnophobia';

	private static readonly GEYSER_BUILDING = 'Desc_GeneratorGeoThermal_C';

	private readonly colors = new MapResourceColors();
	private readonly collectibleCatalog = new CollectibleCatalog();

	public constructor(private readonly icons: IconUrlService)
	{
	}

	public static resourceKey(className: string): string
	{
		return className.replace(/^Desc_/, '').replace(/_C$/, '');
	}

	public static nodeCategory(resourceKey: string, purity: MapPurity): string
	{
		return `${resourceKey}.${purity}`;
	}

	// World sources store the game's own names ("RP_Inpure" - sic), generated worlds lowercase ones.
	public static purity(value: string): MapPurity
	{
		const lower = value.toLowerCase();
		if (lower.includes('inpure') || lower.includes('impure')) {
			return 'impure';
		}
		return lower.includes('pure') && !lower.includes('normal') ? 'pure' : 'normal';
	}

	public nodes(schema: WorldNodesSchema, data: Data, taken: ReadonlySet<string>): MapMarker[]
	{
		const markers: MapMarker[] = [];
		for (const node of schema.resourceNodes) {
			markers.push(this.resourceMarker('node', node.name, node.resource, MapMarkerBuilder.purity(node.purity), node.location, data, taken));
		}
		for (const core of schema.frackingCores) {
			for (const satellite of core.satellites) {
				markers.push(this.resourceMarker('well', satellite.name, core.resource, MapMarkerBuilder.purity(satellite.purity), satellite.location, data, taken));
			}
		}
		const geyserIcon = this.icons.url(data.searchBuildingByClassName(MapMarkerBuilder.GEYSER_BUILDING)?.icon, 64);
		for (const geyser of schema.geysers) {
			const purity = MapMarkerBuilder.purity(geyser.purity);
			markers.push(new MapMarker(
				geyser.name, 'nodes', [MapMarkerBuilder.nodeCategory(MapMarkerBuilder.GEYSER, purity)], MapMarkerBuilder.GEYSER, 'Geysers', '', geyserIcon,
				'geyser', 'Geyser', `${this.purityLabel(purity)} geyser`, MapResourceColors.GEYSER, purity, ...geyser.location, null, taken.has(geyser.name),
			));
		}
		return markers;
	}

	public players(players: GamePlayer[]): MapMarker[]
	{
		return players.map((player, index) => new MapMarker(
			`player-${index}`, 'players', [], null, 'Players', '', null, 'player',
			player.name ?? 'Player', 'Where the player was in the save', MapResourceColors.PLAYER, null, ...player.location,
		));
	}

	public collectibles(schema: CollectiblesSchema, data: Data, background: MapBackground, arachnophobia: boolean, collected: ReadonlySet<string>): MapMarker[]
	{
		const markers: MapMarker[] = [];
		for (const pickup of schema.pickups) {
			const kind = this.collectibleCatalog.pickup(pickup.class);
			if (kind !== null) {
				markers.push(this.collectibleMarker(pickup, kind, data, background, false, collected.has(pickup.name)));
			}
		}
		for (const pod of schema.dropPods) {
			markers.push(this.collectibleMarker(pod, this.collectibleCatalog.dropPod(), data, background, false, collected.has(pod.name)));
		}
		for (const spawner of schema.creatureSpawners) {
			markers.push(this.collectibleMarker(spawner, this.collectibleCatalog.creature(spawner.creature), data, background, arachnophobia, false));
		}
		return markers;
	}

	public purityLabel(purity: MapPurity): string
	{
		return purity.charAt(0).toUpperCase() + purity.slice(1);
	}

	private resourceMarker(
		kind: MapMarkerKind,
		name: string,
		resource: string,
		purity: MapPurity,
		location: [number, number, number],
		data: Data,
		taken: ReadonlySet<string>,
	): MapMarker
	{
		const item = data.searchItemByClassName(resource);
		const key = MapMarkerBuilder.resourceKey(resource);
		const title = item?.name ?? key;
		return new MapMarker(
			name, 'nodes', [MapMarkerBuilder.nodeCategory(key, purity)], key, title, '', this.icons.url(item?.icon, 64), kind,
			title, `${this.purityLabel(purity)} ${kind === 'well' ? 'resource well' : 'resource node'}`,
			this.colors.color(resource, item), purity, ...location, null, taken.has(name),
		);
	}

	private collectibleMarker(entry: CollectibleSchema, kind: CollectibleKind, data: Data, background: MapBackground, arachnophobia: boolean, collected: boolean): MapMarker
	{
		// Loose pickups name their own item; every other collectible's item is fixed by its kind.
		const itemClass = entry.item ?? kind.itemClass;
		const item = itemClass === null ? undefined : data.searchItemByClassName(itemClass);
		const iconUrl = this.icons.url(item?.icon, 64)
			// The game's arachnophobia mode swaps only the creatures that have a replacement picture.
			?? (arachnophobia && kind.mapIcon !== null ? background.iconUrl(kind.mapIcon + MapMarkerBuilder.ARACHNOPHOBIA_SUFFIX) : null)
			?? background.iconUrl(kind.mapIcon)
			?? background.iconUrl(kind.fallbackIcon);
		const title = item?.name ?? kind.label;
		return new MapMarker(
			entry.name, kind.layer, kind.category === null ? [] : [kind.category], kind.category, kind.categoryLabel, kind.group, iconUrl,
			'collectible', title, kind.description, kind.color, null, ...entry.location, entry.amount ?? null, false, collected,
		);
	}

}
