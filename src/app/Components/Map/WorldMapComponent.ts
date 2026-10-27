import {ChangeDetectionStrategy, Component, computed, effect, HostListener, OnDestroy, Optional, signal, untracked, ViewChild} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleNodes, faDrawPolygon, faFilter, faFolderTree, faImage, faIndustry, faLayerGroup, faRulerHorizontal} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {FactorySiteService} from '@src/Components/Map/FactorySiteService';
import {MapAreaComponent} from '@src/Components/Map/MapAreaComponent';
import {MapConveyorsComponent} from '@src/Components/Map/MapConveyorsComponent';
import {MapExportComponent} from '@src/Components/Map/MapExportComponent';
import {MapFactorySiteComponent} from '@src/Components/Map/MapFactorySiteComponent';
import {MapFolderPlans} from '@src/Components/Map/MapFolderPlans';
import {MapFolderPlansComponent} from '@src/Components/Map/MapFolderPlansComponent';
import {MapGameComponent} from '@src/Components/Map/MapGameComponent';
import {MapLayersComponent} from '@src/Components/Map/MapLayersComponent';
import {MapLocation} from '@src/Components/Map/MapLocation';
import {MapMarkerSource} from '@src/Components/Map/MapMarkerSource';
import {MapPanelRequests} from '@src/Components/Map/MapPanelRequests';
import {MapPlanSettingsService} from '@src/Components/Map/MapPlanSettingsService';
import {MapResourceAreaService} from '@src/Components/Map/MapResourceAreaService';
import {MapSearchComponent} from '@src/Components/Map/MapSearchComponent';
import {MapSiteCardComponent} from '@src/Components/Map/MapSiteCardComponent';
import {MapTargetSource} from '@src/Components/Map/MapTargetSource';
import {MapUsedResources} from '@src/Components/Map/MapUsedResources';
import {MapViewComponent} from '@src/Components/Map/MapViewComponent';
import {LoadFromSaveDialogComponent} from '@src/Components/Planner/Panels/Calculator/LoadFromSaveDialogComponent';
import {PlanTreeIconComponent} from '@src/Components/Planner/Panels/Plans/PlanTreeIconComponent';
import {FileDownloader} from '@src/Model/Export/FileDownloader';
import {GameEditor} from '@src/Model/Game/GameEditor';
import {GameManager} from '@src/Model/Game/GameManager';
import {HotkeyRegistration} from '@src/Model/Hotkeys/HotkeyRegistration';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';
import {FactorySiteExplanation} from '@src/Model/Map/FactorySite/FactorySiteExplanation';
import {FactorySiteSpot} from '@src/Model/Map/FactorySite/FactorySiteSpot';
import {MapAreaOutline} from '@src/Model/Map/MapAreaOutline';
import {MapBackgroundManager} from '@src/Model/Map/MapBackgroundManager';
import {MapCoordinateFormatter} from '@src/Model/Map/MapCoordinateFormatter';
import {MapDistanceFormatter} from '@src/Model/Map/MapDistanceFormatter';
import {MapFolderPlan} from '@src/Model/Map/MapFolderPlan';
import {MapImageExporter} from '@src/Model/Map/MapImageExporter';
import {MapLayer} from '@src/Model/Map/MapLayer';
import {MapLayerCatalog} from '@src/Model/Map/MapLayerCatalog';
import {MapLayerState} from '@src/Model/Map/MapLayerState';
import {MapMarker} from '@src/Model/Map/MapMarker';
import {MapMarkToggle} from '@src/Model/Map/MapMarkToggle';
import {MapPin} from '@src/Model/Map/MapPin';
import {MapSearchEntry} from '@src/Model/Map/MapSearchEntry';
import {MapSiteFocus} from '@src/Model/Map/MapSiteFocus';
import {MapSiteLine} from '@src/Model/Map/MapSiteLine';
import {MapView} from '@src/Model/Map/MapView';
import {NotificationService} from '@src/Model/NotificationService';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/**
 * Game tools (search, layers, measuring, export, the save) sit top-left and act on the game, for every plan;
 * the plan dock bottom-right holds what is saved to the plan or folder the map is for.
 */
@Component({
	selector: 'world-map',
	templateUrl: './WorldMapComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [MapMarkerSource, MapPlanSettingsService, MapResourceAreaService, FactorySiteService, MapUsedResources, MapFolderPlans],
	imports: [
		FaIconComponent, AppTooltipDirective, InfoNoteComponent, MapAreaComponent, MapConveyorsComponent, MapExportComponent, MapFactorySiteComponent,
		MapFolderPlansComponent, MapGameComponent, MapLayersComponent, MapSearchComponent, MapSiteCardComponent, MapViewComponent, LoadFromSaveDialogComponent,
		PlanTreeIconComponent,
	],
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			position: relative;
			container: world-map / inline-size;
		}
		map-view {
			flex: 1;
			min-height: 0;
		}
		/* Right of Leaflet's zoom buttons, above its panes and controls (z-index up to 1000). */
		.map-game-bar {
			position: absolute;
			top: 10px;
			left: 52px;
			right: 10px;
			display: flex;
			flex-wrap: wrap;
			align-items: flex-start;
			gap: 6px;
			z-index: 1002;
			pointer-events: none;
		}
		/* Projected buttons (the panel's pop-out) do not get this component's style scope: the wrapper passes pointer events on to them. */
		.map-game-bar > *, .map-game-extra {
			pointer-events: auto;
		}
		.map-game-extra {
			display: contents;
		}
		/* Sized by the map, not the window: a panel docked to one side is much narrower. */
		.map-game-panel {
			position: absolute;
			top: 48px;
			left: 52px;
			max-width: calc(100% - 62px);
			max-height: calc(100% - 58px);
			display: flex;
			z-index: 1001;
		}
		.map-game-panel > * {
			max-height: 100%;
			max-width: 100%;
		}
		.map-plan-dock {
			position: absolute;
			right: 10px;
			bottom: 10px;
			top: 52px;
			display: flex;
			flex-direction: column;
			justify-content: flex-end;
			align-items: flex-end;
			gap: 8px;
			max-width: calc(100% - 20px);
			z-index: 1001;
			pointer-events: none;
		}
		.map-plan-dock > * {
			pointer-events: auto;
			max-width: 100%;
			min-height: 0;
			flex-shrink: 1;
		}
		map-site-card {
			width: 300px;
		}
		.map-plan-strip {
			flex: none !important;
			display: flex;
			flex-direction: column;
			gap: 6px;
			padding: 6px;
			background: rgba(20, 24, 36, 0.92);
			border: 1px solid #34475a;
		}
		.strip-label {
			display: flex;
			align-items: center;
			gap: 6px;
			min-width: 0;
			font-size: 0.875rem;
		}
		.strip-kind {
			font-size: 0.6875rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
		}
		.strip-tools {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 6px;
		}
		.map-draw-bar {
			position: absolute;
			left: 50%;
			bottom: 16px;
			transform: translateX(-50%);
			width: max-content;
			max-width: calc(100% - 20px);
			background: var(--bs-body-bg);
			border: 1px solid #34475a;
			z-index: 1001;
		}
		@container world-map (max-width: 560px) {
			.map-plan-dock {
				left: 10px;
				align-items: stretch;
			}
			map-site-card {
				width: auto;
			}
			map-search {
				width: 100%;
				order: 9;
			}
		}
	`,
})
export class WorldMapComponent implements OnDestroy
{

	private static readonly AREA_COLOR = '#df691a';

	/** Spots of plans outside the folder being shown: there, but quiet. */
	private static readonly OTHER_SPOT_COLOR = '#9fb0c2';

	/** Too many rings would hide what they point at. */
	private static readonly MAX_HIGHLIGHTS = 40;

	public readonly faImage = faImage;
	public readonly faDrawPolygon = faDrawPolygon;
	public readonly faFilter = faFilter;
	public readonly faCircleNodes = faCircleNodes;
	public readonly faFolderTree = faFolderTree;
	public readonly faIndustry = faIndustry;
	public readonly faLayerGroup = faLayerGroup;
	public readonly faRulerHorizontal = faRulerHorizontal;

	@ViewChild(MapViewComponent) private view: MapViewComponent | undefined;

	private readonly saveDialogSignal = signal<{name: string | null} | null>(null);
	public readonly saveDialog = this.saveDialogSignal.asReadonly();

	private readonly sidePanelSignal = signal<'layers' | 'export' | null>(null);
	public readonly sidePanel = this.sidePanelSignal.asReadonly();

	private readonly planPanelSignal = signal<'area' | 'site' | 'plans' | null>(null);
	public readonly planPanel = this.planPanelSignal.asReadonly();

	private readonly focusSignal = signal<[number, number][] | null>(null);
	public readonly focus = this.focusSignal.asReadonly();

	private readonly highlightSignal = signal<[number, number][]>([]);
	public readonly highlight = this.highlightSignal.asReadonly();

	private readonly draftSignal = signal<[number, number][] | null>(null);
	public readonly draft = this.draftSignal.asReadonly();
	public readonly drafting = computed(() => this.draftSignal() !== null);

	private readonly measureSignal = signal<[number, number][] | null>(null);
	public readonly measure = this.measureSignal.asReadonly();
	private readonly measuringSignal = signal(false);
	public readonly measuring = this.measuringSignal.asReadonly();

	public readonly measureText = computed(() => {
		const points = this.measureSignal() ?? [];
		let total = 0;
		for (let i = 1; i < points.length; i++) {
			total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
		}
		return this.distances.format(total);
	});

	private readonly exportingSignal = signal(false);
	public readonly exporting = this.exportingSignal.asReadonly();

	/** Drawing and measuring take the bottom of the map for their own bar. */
	public readonly busyDrawing = computed(() => this.drafting() || this.measuringSignal());

	public readonly layers = computed<MapLayer[]>(() => {
		const layers = [...this.markers.layers()];
		if (this.areaOutlinesAll().length > 0) {
			layers.unshift(this.catalog.area(this.areas.summary()?.nodeCount ?? null));
		}
		if (this.sites.target() !== null) {
			layers.unshift(this.catalog.sites(this.sites.computing() || this.sites.status() === 'loading'));
		}
		if (this.pinsAll().length > 0) {
			layers.unshift(this.catalog.spots(this.pinsAll().length));
		}
		if (this.markers.takenCount() > 0) {
			layers.push(this.catalog.taken(this.markers.takenCount()));
		}
		if (this.markers.collectedCount() > 0) {
			layers.push(this.catalog.collected(this.markers.collectedCount()));
		}
		if (this.markers.playerMarkers().length > 0) {
			layers.push(this.catalog.players(this.markers.playerMarkers().length));
		}
		return layers;
	});

	private readonly sitesShown = computed(() => this.location.layers().isLayerOn('sites'));

	public readonly heatmap = computed(() => this.sitesShown() ? this.sites.result()?.overlay ?? null : null);

	public readonly spots = computed<[number, number][]>(() =>
		this.sitesShown() ? (this.sites.result()?.spots ?? []).map(spot => [spot.x, spot.y]) : []);

	// Any click on the map would otherwise open a site card while the player is just looking around.
	public readonly siteClicks = computed(() => this.planPanelSignal() === 'site' && this.heatmap() !== null && !this.busyDrawing());

	private readonly sitePointSignal = signal<[number, number] | null>(null);

	/** Rebuilt when the heatmap is: changed options change which nodes the spot would use. */
	public readonly siteExplanation = computed<FactorySiteExplanation | null>(() => {
		const spot = this.planSettings.settings()?.factorySpot;
		// The open panel falls back to the saved spot, so clearing another pick goes back to it.
		const point = this.sitePointSignal() ?? (this.planPanelSignal() === 'site' && spot !== undefined ? [spot.x, spot.y] : null);
		if (point === null || this.heatmap() === null || this.busyDrawing()) {
			return null;
		}
		this.sites.result();
		return this.sites.explain(point[0], point[1]);
	});

	public readonly spotLinks = computed(() => this.location.layers().isLayerOn('spotLinks'));

	public readonly spotLinksAvailable = computed(() => this.planSettings.settings()?.factorySpot !== undefined);

	public readonly spotLinksLabel = computed(() => {
		if (!this.spotLinksAvailable()) {
			return 'Pick the factory\'s location first: open Location viability and click on the map';
		}
		return this.spotLinks() ? 'Hide the links to the closest nodes' : 'Show the links from the factory to its closest nodes';
	});

	/** An open site card shows its own links; the saved spot's would only cross them. */
	public readonly siteFocus = computed<MapSiteFocus | null>(() => {
		const explanation = this.siteExplanation() ?? this.spotExplanation();
		return explanation === null ? null : this.focusOf(explanation);
	});

	private readonly spotExplanation = computed<FactorySiteExplanation | null>(() => {
		const spot = this.planSettings.settings()?.factorySpot;
		return this.spotLinks() && spot !== undefined && !this.busyDrawing() ? this.sites.explain(spot.x, spot.y) : null;
	});

	public readonly explanationSaved = computed(() => {
		const explanation = this.siteExplanation();
		const spot = this.planSettings.settings()?.factorySpot;
		return explanation !== null && spot !== undefined && Math.round(explanation.x) === spot.x && Math.round(explanation.y) === spot.y;
	});

	private readonly areaOutlinesAll = computed<MapAreaOutline[]>(() => {
		const outlines: MapAreaOutline[] = [];
		const area = this.areas.area();
		if (area !== null) {
			outlines.push({id: 'target', points: area.points, color: WorldMapComponent.AREA_COLOR, label: null, primary: true});
		}
		for (const plan of this.folderPlans.plans()) {
			if (plan.area !== null) {
				outlines.push({id: plan.id, points: plan.area, color: plan.color, label: plan.name, primary: false});
			}
		}
		return outlines;
	});

	public readonly areaOutlines = computed(() => this.location.layers().isLayerOn('area') ? this.areaOutlinesAll() : []);

	/** Every factory spot of the user's plans and folders, so a new one can be placed with the others in view; only the target's own can be removed here. */
	private readonly pinsAll = computed<MapPin[]>(() => {
		const pins: MapPin[] = [];
		const target = this.planSettings.target();
		const targetId = target?.plan?.id ?? target?.folder?.id ?? null;
		const spot = this.planSettings.settings()?.factorySpot;
		if (target !== null && spot !== undefined) {
			pins.push({
				id: 'target', x: spot.x, y: spot.y, color: WorldMapComponent.AREA_COLOR,
				label: target.plan !== null ? this.planNames.displayName(target.plan) : target.folder!.name,
				removable: this.planSettings.blocker() === null,
			});
		}
		const folderColors = new Map(this.folderPlans.plans().map(plan => [plan.id, plan.color]));
		for (const plan of this.planManager.plans()) {
			const planSpot = plan.settings.factorySpot;
			if (planSpot !== undefined && plan.id !== targetId) {
				pins.push({
					id: plan.id, x: planSpot.x, y: planSpot.y, color: folderColors.get(plan.id) ?? WorldMapComponent.OTHER_SPOT_COLOR,
					label: this.planNames.displayName(plan), removable: false,
				});
			}
		}
		for (const folder of this.planManager.folders()) {
			const folderSpot = folder.settings?.factorySpot;
			if (folderSpot !== undefined && folder.id !== targetId) {
				pins.push({id: folder.id, x: folderSpot.x, y: folderSpot.y, color: WorldMapComponent.OTHER_SPOT_COLOR, label: folder.name, removable: false});
			}
		}
		return pins;
	});

	public readonly pins = computed(() => this.location.layers().isLayerOn('spots') ? this.pinsAll() : []);

	/** With nothing to show, the button would only explain why it cannot draw. */
	public readonly areaButtonDisabled = computed(() => this.areas.area() === null && this.areas.blocker() !== null);

	public readonly areaButtonLabel = computed(() => {
		if (this.areas.area() !== null) {
			return 'Resource area';
		}
		return this.areas.blocker() ?? 'Draw an area to set the resource limits';
	});

	public readonly usedOnly = computed(() => this.location.layers().isLayerOn('usedOnly'));

	public readonly usedAvailable = computed(() => this.used.usedKeys() !== null);

	public readonly usedLabel = computed(() => {
		if (!this.usedAvailable()) {
			return this.planSettings.target() === null ? 'Open a plan first' : 'Calculate the plan first: then the map knows what it mines';
		}
		return this.usedOnly() ? 'Show every resource again' : 'Show only the resources the plan mines';
	});

	public readonly targetName = computed(() => {
		const target = this.planSettings.target();
		if (target === null) {
			return null;
		}
		return target.plan !== null ? this.planNames.displayName(target.plan) : target.folder!.name;
	});

	public readonly targetIconHash = computed(() => {
		const plan = this.planSettings.target()?.plan ?? null;
		return plan === null ? null : this.planIcons.iconHash(plan);
	});

	public readonly isFolder = computed(() => this.planSettings.target()?.folder != null);

	public readonly searchEntries = computed<MapSearchEntry[]>(() => {
		const entries: MapSearchEntry[] = [];
		for (const layer of this.markers.layers()) {
			const categories = layer.groups.flatMap(group => group.categories);
			if (categories.length === 0 && layer.id !== 'nodes') {
				entries.push({id: `layer:${layer.id}`, label: layer.label, detail: 'Turn on the layer', kind: 'Layer', color: null, iconUrl: null, action: {type: 'layer', layer: layer.id}});
			}
			for (const category of categories) {
				entries.push({
					id: `category:${layer.id}:${category.key}`,
					label: category.label,
					detail: `${category.countText} on the map`,
					kind: layer.id === 'nodes' ? 'Resource' : 'Collectible',
					color: category.color,
					iconUrl: category.iconUrl,
					action: {type: 'category', layer: layer.id, ids: category.ids, groupKey: category.key},
				});
			}
		}
		entries.push(...this.itemEntries());
		this.markers.playerMarkers().forEach(player => entries.push({
			id: `player:${player.id}`, label: player.title, detail: 'Where the player was in the save', kind: 'Player', color: player.color, iconUrl: null,
			action: {type: 'points', points: [[player.x, player.y]]},
		}));
		for (const pin of this.pinsAll()) {
			entries.push({id: `pin:${pin.id}`, label: pin.label, detail: 'Factory location', kind: 'Plan', color: pin.color, iconUrl: null, action: {type: 'points', points: [[pin.x, pin.y]]}});
		}
		for (const area of this.areaOutlinesAll()) {
			const label = area.label ?? this.targetName() ?? 'Resource area';
			entries.push({id: `area:${area.id}`, label, detail: 'Resource area', kind: 'Plan', color: area.color, iconUrl: null, action: {type: 'points', points: [...area.points]}});
		}
		return entries;
	});

	public readonly coordinates = computed(() => new MapCoordinateFormatter(this.settings.map().coordinates));

	private hotkeyBlock: HotkeyRegistration | null = null;

	private readonly distances = new MapDistanceFormatter();

	public constructor(
		public readonly backgrounds: MapBackgroundManager,
		public readonly location: MapLocation,
		public readonly markers: MapMarkerSource,
		public readonly areas: MapResourceAreaService,
		private readonly catalog: MapLayerCatalog,
		private readonly hotkeys: HotkeyService,
		public readonly sites: FactorySiteService,
		public readonly planSettings: MapPlanSettingsService,
		public readonly targets: MapTargetSource,
		private readonly folderPlans: MapFolderPlans,
		private readonly used: MapUsedResources,
		private readonly planNames: PlanNameResolver,
		private readonly planManager: PlanManager,
		private readonly planIcons: PlanIconResolver,
		private readonly notifications: NotificationService,
		public readonly games: GameManager,
		private readonly gameEditor: GameEditor,
		private readonly exporter: MapImageExporter,
		private readonly downloader: FileDownloader,
		private readonly settings: SettingsManager,
		@Optional() requests: MapPanelRequests | null,
	)
	{
		effect(() => this.sites.setActive(this.sitesShown() || this.planPanelSignal() === 'site'));

		if (requests !== null) {
			effect(() => {
				const request = requests.pending();
				if (request === null || this.backgrounds.state() !== 'ready') {
					return;
				}
				untracked(() => {
					requests.clear();
					if (request === 'draw') {
						this.startDrawing();
					} else if (request === 'sites') {
						this.showSites();
					} else {
						this.showArea();
					}
				});
			});
		}
	}

	// Document-wide: the map container only has focus after a click on it, and Leaflet takes the arrow keys there.
	@HostListener('document:keydown', ['$event'])
	public onKeyDown(event: KeyboardEvent): void
	{
		if (this.drafting()) {
			if (event.key === 'Escape') {
				this.cancelDrawing();
			} else if (event.key === 'Enter') {
				this.finishDrawing();
			} else if (event.key === 'Backspace') {
				this.undoPoint();
			} else {
				return;
			}
		} else if (this.measuringSignal()) {
			if (event.key === 'Escape') {
				this.stopMeasuring();
			} else if (event.key === 'Enter') {
				this.finishMeasuring();
			} else if (event.key === 'Backspace') {
				this.undoMeasurePoint();
			} else {
				return;
			}
		} else {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
	}

	public onViewChange(view: MapView): void
	{
		this.location.setView(view);
	}

	public onLayersChange(state: MapLayerState): void
	{
		this.location.setLayers(state);
	}

	public toggleSidePanel(panel: 'layers' | 'export'): void
	{
		this.sidePanelSignal.update(current => current === panel ? null : panel);
	}

	public togglePlanPanel(panel: 'area' | 'site' | 'plans'): void
	{
		this.setPlanPanel(this.planPanelSignal() === panel ? null : panel);
	}

	/** Escape also means "back to the planner" on the map page: closing a panel must use it up. */
	public onEscape(event: Event): void
	{
		if (this.sidePanelSignal() !== null) {
			this.sidePanelSignal.set(null);
		} else if (this.sitePointSignal() !== null) {
			this.closeSite();
		} else if (this.planPanelSignal() !== null) {
			this.setPlanPanel(null);
		} else if (this.measureSignal() !== null) {
			this.stopMeasuring();
		} else {
			return;
		}
		event.stopPropagation();
	}

	public closeSidePanel(): void
	{
		this.sidePanelSignal.set(null);
	}

	public closePlanPanel(): void
	{
		this.setPlanPanel(null);
	}

	public onAreaButton(): void
	{
		if (this.drafting()) {
			this.cancelDrawing();
		} else if (this.areas.area() === null) {
			this.startDrawing();
		} else {
			this.togglePlanPanel('area');
		}
	}

	public onSiteButton(): void
	{
		if (this.planPanelSignal() === 'site') {
			this.setPlanPanel(null);
		} else {
			this.setPlanPanel('site');
			this.showSites();
		}
	}

	/** Just the layer: a settings panel would cover most of a small map. */
	public showSites(): void
	{
		if (!this.sitesShown()) {
			this.location.setLayers(this.location.layers().withLayer('sites', true));
		}
	}

	public toggleSpotLinks(): void
	{
		if (this.spotLinksAvailable() || this.spotLinks()) {
			this.location.setLayers(this.location.layers().withLayer('spotLinks', !this.spotLinks()));
		}
	}

	public toggleUsedOnly(): void
	{
		if (this.usedAvailable() || this.usedOnly()) {
			this.location.setLayers(this.location.layers().withLayer('usedOnly', !this.usedOnly()));
		}
	}

	public onMarkToggle(toggle: MapMarkToggle): void
	{
		if (toggle.kind === 'taken') {
			this.gameEditor.setTaken(toggle.id, toggle.on);
		} else {
			this.games.setCollected(toggle.id, toggle.on);
		}
	}

	public openSaveDialog(): void
	{
		this.saveDialogSignal.set({name: this.targetName()});
	}

	/** The unlocks go to the plan as it is now: loading the map's part may have just counted its area again. */
	public applySave(patch: Partial<PlanSettings> | null): void
	{
		const dialog = this.saveDialogSignal();
		this.saveDialogSignal.set(null);
		if (dialog === null) {
			return;
		}
		if (patch !== null && dialog.name !== null && this.planSettings.update(settings => ({...settings, ...patch}), false)) {
			this.notifications.showSuccess(`Loaded the save file, and its unlocks into "${dialog.name}".`);
		} else {
			this.notifications.showSuccess('Loaded your game from the save file.');
		}
	}

	public closeSaveDialog(): void
	{
		this.saveDialogSignal.set(null);
	}

	public onSiteClick(point: [number, number]): void
	{
		this.sitePointSignal.set(point);
	}

	public closeSite(): void
	{
		this.sitePointSignal.set(null);
	}

	public useSpot(): void
	{
		const explanation = this.siteExplanation();
		if (explanation === null) {
			return;
		}
		const spot = {x: Math.round(explanation.x), y: Math.round(explanation.y)};
		if (this.planSettings.update(settings => ({...settings, factorySpot: spot}), false) && !this.location.layers().isLayerOn('spots')) {
			this.location.setLayers(this.location.layers().withLayer('spots', true));
		}
	}

	public removePin(id: string): void
	{
		if (id === 'target') {
			this.planSettings.update(settings => ({...settings, factorySpot: undefined}), false);
		}
	}

	/** Zooms out far enough to show every node the spot would use. */
	public showSpot(spot: FactorySiteSpot): void
	{
		this.sitePointSignal.set([spot.x, spot.y]);
		const focus = this.siteFocus();
		this.focusSignal.set([[spot.x, spot.y], ...(focus?.lines ?? []).map(line => [line.x, line.y] as [number, number])]);
	}

	public focusFolderPlan(plan: MapFolderPlan): void
	{
		const points: [number, number][] = plan.area !== null ? plan.area.map(([x, y]) => [x, y]) : [];
		if (plan.spot !== null) {
			points.push([plan.spot.x, plan.spot.y]);
		}
		this.showLayers(['area', 'spots']);
		this.focusSignal.set(points);
	}

	public onSearch(entry: MapSearchEntry): void
	{
		const action = entry.action;
		if (action.type === 'layer') {
			this.showLayers([action.layer]);
			this.highlightSignal.set([]);
			return;
		}
		if (action.type === 'markers') {
			this.showLayers([action.layer]);
		}
		if (action.type === 'points' || action.type === 'markers') {
			this.focusSignal.set(action.points.map(([x, y]) => [x, y]));
			this.highlightSignal.set(action.points.length <= WorldMapComponent.MAX_HIGHLIGHTS ? action.points.map(([x, y]) => [x, y]) : []);
			return;
		}
		let state = this.location.layers().withLayer(action.layer, true).withShown(action.ids, true);
		if (action.layer === 'nodes' && state.isLayerOn('usedOnly')) {
			state = state.withLayer('usedOnly', false);
		}
		this.location.setLayers(state);
		const members = [...this.markers.nodeMarkers() ?? [], ...this.markers.collectibleMarkers() ?? []]
			.filter(marker => marker.layer === action.layer && marker.groupKey === action.groupKey);
		const points = members.map(marker => [marker.x, marker.y] as [number, number]);
		if (points.length > 0) {
			this.focusSignal.set(points);
		}
		this.highlightSignal.set(points.length <= WorldMapComponent.MAX_HIGHLIGHTS ? points : []);
	}

	public clearHighlight(): void
	{
		this.highlightSignal.set([]);
	}

	public startMeasuring(): void
	{
		if (this.measuringSignal()) {
			this.stopMeasuring();
			return;
		}
		this.cancelDrawing();
		this.measureSignal.set([]);
		this.measuringSignal.set(true);
		this.hotkeyBlock ??= this.hotkeys.block();
	}

	public addMeasurePoint(point: [number, number]): void
	{
		this.measureSignal.update(points => points === null ? [point] : [...points, point]);
	}

	public undoMeasurePoint(): void
	{
		this.measureSignal.update(points => points === null ? null : points.slice(0, -1));
	}

	/** The line stays on the map until it is cleared. */
	public finishMeasuring(): void
	{
		this.measuringSignal.set(false);
		if ((this.measureSignal()?.length ?? 0) < 2) {
			this.measureSignal.set(null);
		}
		this.releaseHotkeys();
	}

	public stopMeasuring(): void
	{
		this.measuringSignal.set(false);
		this.measureSignal.set(null);
		this.releaseHotkeys();
	}

	public async exportImage(options: {scope: 'view' | 'whole'; width: number}): Promise<void>
	{
		const background = this.backgrounds.background();
		const bounds = options.scope === 'view'
			? this.view?.visibleImageBounds() ?? null
			: (background === null ? null : [0, 0, background.size, background.size] as [number, number, number, number]);
		if (background === null || bounds === null) {
			return;
		}
		this.exportingSignal.set(true);
		try {
			const blob = await this.exporter.export(background, {bounds, width: options.width}, this.markers.visibleMarkers(), this.areaOutlines(), this.pins(), this.heatmap());
			const name = this.targetName() ?? (this.games.activeGame()?.sessionName || 'Map');
			await this.downloader.download(blob, this.downloader.safeName(`${name} map`, 'png', 'Map'));
		} catch (error) {
			this.notifications.show(error instanceof Error ? error.message : 'The picture could not be made.');
		} finally {
			this.exportingSignal.set(false);
		}
	}

	public viewWidth(): number
	{
		return this.view?.viewWidth() ?? 1000;
	}

	public startDrawing(): void
	{
		if (this.areas.blocker() !== null) {
			return;
		}
		this.stopMeasuring();
		this.setPlanPanel(null);
		this.draftSignal.set([]);
		this.hotkeyBlock ??= this.hotkeys.block();
	}

	public addPoint(point: [number, number]): void
	{
		this.draftSignal.update(points => points === null ? null : [...points, point]);
	}

	public undoPoint(): void
	{
		this.draftSignal.update(points => points === null ? null : points.slice(0, -1));
	}

	public finishDrawing(): void
	{
		const points = this.draftSignal();
		if (points === null || points.length < 3) {
			return;
		}
		this.stopDrawing();
		if (this.areas.draw(points)) {
			// The area is a layer: hidden, the result would be invisible.
			this.showLayers(['area']);
			this.setPlanPanel('area');
		}
	}

	public showArea(): void
	{
		const area = this.areas.area();
		if (area === null) {
			return;
		}
		this.showLayers(['area']);
		this.focusSignal.set([...area.points]);
	}

	public cancelDrawing(): void
	{
		this.stopDrawing();
	}

	public ngOnDestroy(): void
	{
		this.stopDrawing();
		this.stopMeasuring();
	}

	/** Items on the ground share one category, so each item they hold gets its own entry. */
	private itemEntries(): MapSearchEntry[]
	{
		const items = new Map<string, MapMarker[]>();
		for (const marker of this.markers.collectibleMarkers() ?? []) {
			if (marker.groupKey !== null) {
				continue;
			}
			const key = `${marker.layer}:${marker.title}`;
			const members = items.get(key);
			if (members === undefined) {
				items.set(key, [marker]);
			} else {
				members.push(marker);
			}
		}
		return [...items.entries()].map(([key, members]) => {
			const left = members.filter(marker => !marker.collected).length;
			const count = left === members.length ? `${members.length}` : `${left} / ${members.length}`;
			return {
				id: `item:${key}`,
				label: members[0].title,
				detail: `${count} ${members.length === 1 ? 'place' : 'places'} on the ground`,
				kind: 'Item',
				color: members[0].color,
				iconUrl: members[0].iconUrl,
				action: {type: 'markers', layer: members[0].layer, points: members.map(marker => [marker.x, marker.y] as const)},
			};
		});
	}

	private focusOf(explanation: FactorySiteExplanation): MapSiteFocus
	{
		const lines: MapSiteLine[] = [];
		for (const use of explanation.resources) {
			const color = this.sites.color(use.className);
			for (const index of use.nodes) {
				const position = this.sites.nodePosition(use.className, index);
				if (position !== null) {
					lines.push({x: position[0], y: position[1], color});
				}
			}
		}
		return {x: explanation.x, y: explanation.y, lines};
	}

	private setPlanPanel(panel: 'area' | 'site' | 'plans' | null): void
	{
		// The panel shows the picked location: closing it would otherwise pop that out as a card of its own.
		if (this.planPanelSignal() === 'site' && panel !== 'site') {
			this.sitePointSignal.set(null);
		}
		this.planPanelSignal.set(panel);
	}

	private showLayers(ids: Parameters<MapLayerState['withLayer']>[0][]): void
	{
		let state = this.location.layers();
		for (const id of ids) {
			state = state.withLayer(id, true);
		}
		if (!state.equals(this.location.layers())) {
			this.location.setLayers(state);
		}
	}

	private stopDrawing(): void
	{
		this.draftSignal.set(null);
		this.releaseHotkeys();
	}

	private releaseHotkeys(): void
	{
		if (this.drafting() || this.measuringSignal()) {
			return;
		}
		this.hotkeyBlock?.unregister();
		this.hotkeyBlock = null;
	}

}
