import {computed, Injectable, signal} from '@angular/core';
import {httpResource} from '@angular/common/http';
import {env} from '@env/env';
import {MapLocation} from '@src/Components/Map/MapLocation';
import {MapUsedResources} from '@src/Components/Map/MapUsedResources';
import {CollectiblesSchema} from '@src/Model/API/Schema/World/CollectiblesSchema';
import {WorldNodesSchema} from '@src/Model/API/Schema/World/WorldNodesSchema';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {GameManager} from '@src/Model/Game/GameManager';
import {MapBackgroundManager} from '@src/Model/Map/MapBackgroundManager';
import {MapLayer} from '@src/Model/Map/MapLayer';
import {MapLayerCatalog} from '@src/Model/Map/MapLayerCatalog';
import {MapMarker} from '@src/Model/Map/MapMarker';
import {MapMarkerBuilder} from '@src/Model/Map/MapMarkerBuilder';
import {WorldNodesManager} from '@src/Model/Map/WorldNodesManager';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Injectable()
export class MapMarkerSource
{

	private readonly data = computed(() => this.versionManager.activeVersionData());

	// The collectibles file is ten times the nodes one: fetched once a collectible layer is first turned on or the search is used, then kept.
	private collectiblesRequested = false;
	private readonly collectiblesWantedSignal = signal(false);

	private readonly collectiblesResource = httpResource<CollectiblesSchema>(() => {
		const path = this.data()?.collectiblesPath ?? null;
		if (path === null) {
			return undefined;
		}
		this.collectiblesRequested ||= this.collectiblesWantedSignal() || this.location.layers().anyLayerOn(MapLayerCatalog.COLLECTIBLE_LAYERS);
		return this.collectiblesRequested ? `${env.apiUrl}/${path}` : undefined;
	});

	public readonly worldNodes = computed<WorldNodesSchema | null>(() => this.worldNodesManager.nodes());

	public readonly nodeMarkers = computed<MapMarker[] | null>(() => {
		const data = this.data();
		const world = this.worldNodes();
		return data !== null && world !== null ? this.builder.nodes(world, data, this.games.taken()) : null;
	});

	public readonly takenCount = computed(() => this.nodeMarkers()?.filter(marker => marker.taken).length ?? 0);

	public readonly playerMarkers = computed<MapMarker[]>(() => this.builder.players(this.games.activeGame()?.players ?? []));

	public readonly collectibleMarkers = computed<MapMarker[] | null>(() => {
		const data = this.data();
		const background = this.backgrounds.background();
		return data !== null && background !== null && this.collectiblesResource.hasValue()
			? this.builder.collectibles(this.collectiblesResource.value(), data, background, this.settings.map().arachnophobia, this.games.collected())
			: null;
	});

	/** Counted on the collectible layers that are loaded; the rest are not known yet. */
	public readonly collectedCount = computed(() => this.collectibleMarkers()?.filter(marker => marker.collected).length ?? this.games.collected().size);

	/** Resources the plan mines, by node category key; null when the filter is off or there is nothing to filter by. */
	private readonly usedResources = computed<ReadonlySet<string> | null>(() => {
		if (!this.location.layers().isLayerOn('usedOnly')) {
			return null;
		}
		return this.used.usedKeys();
	});

	public readonly layers = computed<MapLayer[]>(() => this.catalog.build(
		this.nodeMarkers(),
		this.collectibleMarkers(),
		this.worldNodesManager.path() !== null,
		(this.data()?.collectiblesPath ?? null) !== null,
	));

	public readonly visibleMarkers = computed<MapMarker[]>(() => {
		const state = this.location.layers();
		const used = this.usedResources();
		return [...this.nodeMarkers() ?? [], ...this.collectibleMarkers() ?? [], ...this.playerMarkers()]
			.filter(marker => state.isLayerOn(marker.layer)
				&& (!marker.taken || state.isLayerOn('taken'))
				&& (!marker.collected || state.isLayerOn('collected'))
				&& (used === null || marker.layer !== 'nodes' || (marker.groupKey !== null && used.has(marker.groupKey)))
				&& marker.categories.every(category => state.isShown(category)));
	});

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly backgrounds: MapBackgroundManager,
		private readonly location: MapLocation,
		private readonly builder: MapMarkerBuilder,
		private readonly catalog: MapLayerCatalog,
		private readonly settings: SettingsManager,
		private readonly worldNodesManager: WorldNodesManager,
		private readonly games: GameManager,
		private readonly used: MapUsedResources,
	)
	{
	}

	/** Searching finds single items on the ground, so it needs them loaded. */
	public requestCollectibles(): void
	{
		this.collectiblesWantedSignal.set(true);
	}

}
