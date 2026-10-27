import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, AfterViewInit} from '@angular/core';
import {faExpand, faIndustry} from '@fortawesome/free-solid-svg-icons';
import type * as Leaflet from 'leaflet';
import {MapCanvasIcons} from '@src/Components/Map/MapCanvasIcons';
import {MapMarkerIcons} from '@src/Components/Map/MapMarkerIcons';
import {MapMarkerPopup} from '@src/Components/Map/MapMarkerPopup';
import {LeafletLoader} from '@src/Model/Map/LeafletLoader';
import {MapAreaOutline} from '@src/Model/Map/MapAreaOutline';
import {MapBackground} from '@src/Model/Map/MapBackground';
import {MapCoordinateFormatter} from '@src/Model/Map/MapCoordinateFormatter';
import {MapDistanceFormatter} from '@src/Model/Map/MapDistanceFormatter';
import {MapImageOverlay} from '@src/Model/Map/MapImageOverlay';
import {MapMarker} from '@src/Model/Map/MapMarker';
import {MapMarkToggle} from '@src/Model/Map/MapMarkToggle';
import {MapPin} from '@src/Model/Map/MapPin';
import {MapSiteFocus} from '@src/Model/Map/MapSiteFocus';
import {MapView} from '@src/Model/Map/MapView';

@Component({
	selector: 'map-view',
	template: '<div class="map-canvas" #canvas></div>',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: `
		:host {
			display: block;
			position: relative;
			overflow: hidden;
		}
		.map-canvas {
			position: absolute;
			inset: 0;
			background: #141824;
		}
	`,
})
export class MapViewComponent implements AfterViewInit, OnChanges, OnDestroy
{

	/** Zoom levels past the deepest tiles: the tiles are upscaled, which still helps to aim at small things. */
	private static readonly EXTRA_ZOOM = 2;

	private static readonly PURITY_Z_OFFSET = {impure: 0, normal: 100, pure: 200};

	private static readonly AREA_COLOR = '#df691a';

	private static readonly MEASURE_COLOR = '#5bc0de';

	/** Zoomed out further than this many levels from the deepest tiles, markers are grouped. */
	private static readonly CLUSTER_LEVELS = 2;

	/** Screen pixels: markers within a cell this size become one bubble. */
	private static readonly CLUSTER_CELL = 64;

	/** Fewer than this stay single: a bubble of two hides little. */
	private static readonly CLUSTER_MIN = 3;

	/** Screen pixels: a click this close to the first corner closes the outline. */
	private static readonly CLOSE_DISTANCE = 12;

	/** A double-click's second click lands on the corner its first one just placed. */
	private static readonly DUPLICATE_DISTANCE = 6;

	@Input({required: true}) public background!: MapBackground;
	@Input() public view: MapView | null = null;
	@Input() public markers: MapMarker[] = [];
	@Input() public symbols = false;
	@Input() public areas: ReadonlyArray<MapAreaOutline> = [];
	@Input() public pins: ReadonlyArray<MapPin> = [];
	@Input() public measuring = false;
	/** World X/Y points of the line being measured. */
	@Input() public measure: ReadonlyArray<readonly [number, number]> = [];
	/** World X/Y spots to ring, such as search results. */
	@Input() public highlight: ReadonlyArray<readonly [number, number]> = [];
	@Input() public clusters = false;
	@Input() public coordinates = new MapCoordinateFormatter();
	@Input() public drafting = false;
	@Input() public draft: ReadonlyArray<readonly [number, number]> = [];
	/** World X/Y corners to zoom to; a new array each time, so the same area can be shown again. */
	@Input() public focus: ReadonlyArray<readonly [number, number]> | null = null;
	@Input() public heatmap: MapImageOverlay | null = null;
	/** World X/Y, best first. */
	@Input() public spots: ReadonlyArray<readonly [number, number]> = [];
	@Input() public siteFocus: MapSiteFocus | null = null;
	/** Clicks on the bare map ask about that spot. */
	@Input() public siteClicks = false;
	/** Popups offer to mark nodes taken and collectibles collected. */
	@Input() public marksEditable = false;
	@Output() public readonly viewChange = new EventEmitter<MapView>();
	@Output() public readonly siteClick = new EventEmitter<[number, number]>();
	@Output() public readonly draftPoint = new EventEmitter<[number, number]>();
	@Output() public readonly draftClose = new EventEmitter<void>();
	@Output() public readonly markToggle = new EventEmitter<MapMarkToggle>();
	@Output() public readonly measurePoint = new EventEmitter<[number, number]>();
	@Output() public readonly measureEnd = new EventEmitter<void>();
	@Output() public readonly pinRemove = new EventEmitter<string>();

	@ViewChild('canvas', {static: true}) private canvas!: ElementRef<HTMLDivElement>;

	private leaflet: typeof Leaflet | null = null;
	private map: Leaflet.Map | null = null;
	private tiles: Leaflet.TileLayer | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private nodeLayer: Leaflet.LayerGroup | null = null;
	// Thousands of collectibles: one canvas draws them far faster than one DOM element each.
	private collectibleRenderer: Leaflet.Canvas | null = null;
	private icons: MapMarkerIcons | null = null;
	private canvasIcons: MapCanvasIcons | null = null;
	private readonly popup = new MapMarkerPopup();
	private readonly markerLayers = new Map<string, Leaflet.Layer>();
	private areaLayer: Leaflet.LayerGroup | null = null;
	private draftLayer: Leaflet.LayerGroup | null = null;
	private rubberBand: Leaflet.Polyline | null = null;
	private measureLayer: Leaflet.LayerGroup | null = null;
	private measureBand: Leaflet.Polyline | null = null;
	private pinLayer: Leaflet.LayerGroup | null = null;
	private highlightLayer: Leaflet.LayerGroup | null = null;
	private coordinateReadout: HTMLElement | null = null;
	private readonly distances = new MapDistanceFormatter();
	/** Whether the markers on the map were last drawn grouped: only crossing that line, or zooming while grouped, redraws them. */
	private clustered = false;
	private heatLayer: Leaflet.ImageOverlay | null = null;
	private spotLayer: Leaflet.LayerGroup | null = null;
	private siteLayer: Leaflet.LayerGroup | null = null;
	// Canvas markers pass their clicks on to the map; that click opened the marker's popup and must not also ask about the spot.
	private markerClicked = false;
	private destroyed = false;
	// The canvas can be zero-sized (a panel that has not been laid out yet); the first real size gets the initial view.
	private pendingInitialView = true;

	public constructor(
		private readonly loader: LeafletLoader,
		private readonly zone: NgZone,
	)
	{
	}

	public ngAfterViewInit(): void
	{
		void this.loader.load().then(leaflet => {
			if (this.destroyed) {
				return;
			}
			this.leaflet = leaflet;
			// Leaflet listens to every pointer move; none of that needs change detection.
			this.zone.runOutsideAngular(() => this.createMap());
		});
	}

	public ngOnChanges(changes: SimpleChanges): void
	{
		if (this.map === null) {
			return;
		}
		if (changes['background'] && !changes['background'].firstChange) {
			this.zone.runOutsideAngular(() => {
				this.applyBackground();
				this.pendingInitialView = true;
				this.showInitialView();
				this.clearMarkers();
				this.syncMarkers();
				this.renderArea();
				this.renderDraft();
				this.renderHeatmap();
				this.renderSpots();
				this.renderSiteFocus();
				this.renderPins();
				this.renderMeasure();
				this.renderHighlight();
			});
		} else {
			if (changes['view'] && this.view !== null && !this.view.equals(this.currentView())) {
				this.zone.runOutsideAngular(() => this.applyView(this.view!));
			}
			if (changes['symbols'] && !changes['symbols'].firstChange) {
				this.zone.runOutsideAngular(() => {
					this.canvasIcons!.symbols = this.symbols;
					this.clearMarkers();
					this.syncMarkers();
				});
			} else if (changes['markers'] || changes['clusters']) {
				this.zone.runOutsideAngular(() => this.syncMarkers());
			}
			if (changes['areas']) {
				this.zone.runOutsideAngular(() => this.renderArea());
			}
			if (changes['drafting'] || changes['measuring']) {
				this.zone.runOutsideAngular(() => this.applyDrafting());
			}
			if (changes['measure'] || changes['measuring']) {
				this.zone.runOutsideAngular(() => this.renderMeasure());
			}
			if (changes['pins']) {
				this.zone.runOutsideAngular(() => this.renderPins());
			}
			if (changes['highlight']) {
				this.zone.runOutsideAngular(() => this.renderHighlight());
			}
			if (changes['draft'] || changes['drafting']) {
				this.zone.runOutsideAngular(() => this.renderDraft());
			}
			if (changes['heatmap']) {
				this.zone.runOutsideAngular(() => this.renderHeatmap());
			}
			if (changes['spots']) {
				this.zone.runOutsideAngular(() => this.renderSpots());
			}
			if (changes['siteFocus']) {
				this.zone.runOutsideAngular(() => this.renderSiteFocus());
			}
			if (changes['focus'] && !this.pendingInitialView) {
				this.zone.runOutsideAngular(() => this.applyFocus());
			}
		}
	}

	public ngOnDestroy(): void
	{
		this.destroyed = true;
		this.resizeObserver?.disconnect();
		this.map?.remove();
		this.map = null;
	}

	private createMap(): void
	{
		const leaflet = this.leaflet!;
		this.map = leaflet.map(this.canvas.nativeElement, {
			crs: leaflet.CRS.Simple,
			attributionControl: false,
			zoomSnap: 0.25,
			zoomDelta: 0.5,
			wheelPxPerZoomLevel: 120,
			maxBoundsViscosity: 0.8,
		});
		this.applyBackground();
		this.addFitButton();
		this.nodeLayer = leaflet.layerGroup().addTo(this.map);
		this.collectibleRenderer = leaflet.canvas({padding: 0.5});
		this.icons = new MapMarkerIcons(leaflet);
		this.canvasIcons = new MapCanvasIcons(leaflet);
		this.canvasIcons.symbols = this.symbols;

		// Below the markers, so they stay clickable through the fill; the outline being drawn goes above them.
		this.map.createPane('heat').style.zIndex = '340';
		this.map.createPane('area').style.zIndex = '350';
		this.map.createPane('site').style.zIndex = '360';
		this.map.createPane('draft').style.zIndex = '650';
		this.map.createPane('highlight').style.zIndex = '640';
		this.map.createPane('pins').style.zIndex = '645';
		this.areaLayer = leaflet.layerGroup().addTo(this.map);
		this.measureLayer = leaflet.layerGroup().addTo(this.map);
		this.pinLayer = leaflet.layerGroup().addTo(this.map);
		this.highlightLayer = leaflet.layerGroup().addTo(this.map);
		this.addCoordinates();
		this.draftLayer = leaflet.layerGroup().addTo(this.map);
		this.spotLayer = leaflet.layerGroup().addTo(this.map);
		this.siteLayer = leaflet.layerGroup().addTo(this.map);
		this.map.on('click', event => {
			const markerClicked = this.markerClicked;
			this.markerClicked = false;
			if (this.drafting) {
				this.onDraftClick(event.latlng);
			} else if (this.measuring) {
				this.zone.run(() => this.measurePoint.emit(this.toWorld(event.latlng)));
			} else if (this.siteClicks && !markerClicked) {
				this.zone.run(() => this.siteClick.emit(this.toWorld(event.latlng)));
			}
		});
		this.map.on('dblclick', () => {
			if (this.drafting) {
				this.zone.run(() => this.draftClose.emit());
			} else if (this.measuring) {
				this.zone.run(() => this.measureEnd.emit());
			}
		});
		this.map.on('mousemove', event => {
			this.rubberBand?.setLatLngs([this.rubberBand.getLatLngs()[0] as Leaflet.LatLng, event.latlng]);
			this.measureBand?.setLatLngs([this.measureBand.getLatLngs()[0] as Leaflet.LatLng, event.latlng]);
			this.showCoordinates(event.latlng);
		});
		this.map.on('mouseout', () => this.showCoordinates(null));
		// Clicks on canvas markers still reach the map; while drawing they place corners, not popups.
		this.map.on('popupopen', () => {
			if (this.drafting || this.measuring) {
				this.map!.closePopup();
			}
		});
		this.map.on('zoomend', () => {
			if (this.clustered || this.shouldCluster()) {
				this.syncMarkers();
			}
		});

		this.map.on('moveend', () => {
			const view = this.currentView();
			if (view !== null && !this.pendingInitialView) {
				this.zone.run(() => this.viewChange.emit(view));
			}
		});

		this.resizeObserver = new ResizeObserver(() => {
			this.map?.invalidateSize({pan: false});
			this.showInitialView();
		});
		this.resizeObserver.observe(this.canvas.nativeElement);
		this.showInitialView();
		this.syncMarkers();
		this.renderArea();
		this.applyDrafting();
		this.renderDraft();
		this.renderHeatmap();
		this.renderSpots();
		this.renderSiteFocus();
		this.renderPins();
		this.renderMeasure();
		this.renderHighlight();
	}

	/** What the view shows, in full-size image pixels, for exporting it. */
	public visibleImageBounds(): [number, number, number, number] | null
	{
		if (this.map === null) {
			return null;
		}
		const bounds = this.map.getBounds();
		const topLeft = this.map.project(bounds.getNorthWest(), this.background.maxZoom);
		const bottomRight = this.map.project(bounds.getSouthEast(), this.background.maxZoom);
		const clamp = (value: number): number => Math.max(0, Math.min(this.background.size, value));
		const box: [number, number, number, number] = [clamp(topLeft.x), clamp(topLeft.y), clamp(bottomRight.x), clamp(bottomRight.y)];
		return box[2] - box[0] < 1 || box[3] - box[1] < 1 ? null : box;
	}

	/** On-screen width of the view, so an export of it can match. */
	public viewWidth(): number
	{
		return this.map?.getSize().x ?? 0;
	}

	/** Updated outside Angular: a readout that follows the mouse would otherwise run change detection on every move. */
	private addCoordinates(): void
	{
		const leaflet = this.leaflet!;
		const control = new leaflet.Control({position: 'bottomleft'});
		control.onAdd = () => {
			const element = leaflet.DomUtil.create('div', 'map-coordinates');
			this.coordinateReadout = element;
			return element;
		};
		control.addTo(this.map!);
	}

	private showCoordinates(position: Leaflet.LatLng | null): void
	{
		if (this.coordinateReadout === null) {
			return;
		}
		if (position === null) {
			this.coordinateReadout.textContent = '';
			return;
		}
		const [x, y] = this.toWorld(position);
		this.coordinateReadout.textContent = `X ${this.coordinates.format(x)}  Y ${this.coordinates.format(y)}`;
	}

	private renderMeasure(): void
	{
		const leaflet = this.leaflet!;
		this.measureLayer?.clearLayers();
		this.measureBand = null;
		if (this.measure.length === 0) {
			return;
		}
		const points = this.measure.map(([x, y]) => this.worldToLatLng(x, y));
		const style = {pane: 'draft', color: MapViewComponent.MEASURE_COLOR, weight: 3, interactive: false};
		leaflet.polyline(points, style).addTo(this.measureLayer!);
		if (this.measuring) {
			this.measureBand = leaflet.polyline([points[points.length - 1], points[points.length - 1]], {...style, dashArray: '4 6'}).addTo(this.measureLayer!);
		}
		let total = 0;
		this.measure.forEach(([x, y], index) => {
			if (index > 0) {
				const [px, py] = this.measure[index - 1];
				total += Math.hypot(x - px, y - py);
			}
			const vertex = leaflet.circleMarker(points[index], {...style, radius: 4, weight: 2, fillColor: '#fff', fillOpacity: 1});
			if (index > 0) {
				vertex.bindTooltip(this.distances.format(total), {permanent: true, direction: 'top', offset: [0, -6], className: 'map-measure-label'});
			}
			vertex.addTo(this.measureLayer!);
		});
	}

	private renderPins(): void
	{
		const leaflet = this.leaflet!;
		this.pinLayer?.clearLayers();
		const [width, height, , , path] = faIndustry.icon;
		for (const pin of this.pins) {
			const label = document.createElement('span');
			label.className = 'map-pin-label';
			label.textContent = pin.label;
			const marker = leaflet.marker(this.worldToLatLng(pin.x, pin.y), {
				pane: 'pins',
				icon: leaflet.divIcon({
					className: 'map-pin-icon',
					html: `<span class="map-pin-disc" style="--marker-color: ${pin.color}">`
						+ `<svg viewBox="0 0 ${width} ${height}" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg></span>`
						+ label.outerHTML,
					iconSize: [26, 26],
					iconAnchor: [13, 13],
					popupAnchor: [0, -13],
				}),
				keyboard: false,
				title: pin.label,
			});
			marker.bindPopup(() => this.pinPopup(pin), {className: 'map-popup', autoPanPadding: [16, 16]});
			marker.addTo(this.pinLayer!);
		}
	}

	private pinPopup(pin: MapPin): HTMLElement
	{
		const root = document.createElement('div');
		root.className = 'map-popup-body selectable';
		const title = document.createElement('div');
		title.className = 'map-popup-title';
		title.textContent = 'Factory location';
		const description = document.createElement('div');
		description.className = 'map-popup-description';
		description.textContent = pin.label;
		root.append(title, description);
		if (pin.removable) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'btn btn-sm btn-outline-light py-0 mt-2';
			button.textContent = 'Remove the location';
			button.addEventListener('click', () => {
				this.map?.closePopup();
				this.zone.run(() => this.pinRemove.emit(pin.id));
			});
			root.append(button);
		}
		return root;
	}

	private renderHighlight(): void
	{
		const leaflet = this.leaflet!;
		this.highlightLayer?.clearLayers();
		for (const [x, y] of this.highlight) {
			leaflet.circleMarker(this.worldToLatLng(x, y), {
				pane: 'highlight', radius: 15, color: '#fff', weight: 2, fill: false, interactive: false, className: 'map-highlight-ring',
			}).addTo(this.highlightLayer!);
		}
	}

	private renderHeatmap(): void
	{
		this.heatLayer?.remove();
		this.heatLayer = null;
		if (this.heatmap === null) {
			return;
		}
		const overlay = this.heatmap;
		this.heatLayer = this.leaflet!.imageOverlay(
			overlay.url,
			this.leaflet!.latLngBounds(this.worldToLatLng(overlay.minX, overlay.minY), this.worldToLatLng(overlay.maxX, overlay.maxY)),
			{pane: 'heat', opacity: 0.55, interactive: false},
		).addTo(this.map!);
	}

	private renderSpots(): void
	{
		const leaflet = this.leaflet!;
		this.spotLayer?.clearLayers();
		this.spots.forEach(([x, y], index) => {
			const marker = leaflet.marker(this.worldToLatLng(x, y), {
				icon: leaflet.divIcon({className: '', html: `<div class="map-site-spot">${index + 1}</div>`, iconSize: [24, 24], iconAnchor: [12, 12]}),
				keyboard: false,
				title: `Best spot ${index + 1}`,
				zIndexOffset: 1000,
			});
			marker.on('click', () => this.zone.run(() => this.siteClick.emit([x, y])));
			marker.addTo(this.spotLayer!);
		});
	}

	private renderSiteFocus(): void
	{
		const leaflet = this.leaflet!;
		this.siteLayer?.clearLayers();
		const focus = this.siteFocus;
		if (focus === null) {
			return;
		}
		const site = this.worldToLatLng(focus.x, focus.y);
		for (const line of focus.lines) {
			leaflet.polyline([site, this.worldToLatLng(line.x, line.y)], {pane: 'site', color: line.color, weight: 2, opacity: 0.9, dashArray: '6 5', interactive: false})
				.addTo(this.siteLayer!);
		}
		leaflet.circleMarker(site, {pane: 'site', radius: 6, color: '#111', weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false})
			.addTo(this.siteLayer!);
	}

	/** In Leaflet's own zoom bar, beside the buttons it belongs with. */
	private addFitButton(): void
	{
		const leaflet = this.leaflet!;
		const container = this.map!.zoomControl.getContainer();
		if (container === undefined) {
			return;
		}
		const [width, height, , , path] = faExpand.icon;
		const button = leaflet.DomUtil.create('a', 'leaflet-control-zoom-fit', container);
		button.href = '#';
		button.title = 'Show the whole map';
		button.setAttribute('role', 'button');
		button.setAttribute('aria-label', 'Show the whole map');
		button.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg>`;
		leaflet.DomEvent.disableClickPropagation(button);
		leaflet.DomEvent.on(button, 'click', event => {
			leaflet.DomEvent.preventDefault(event);
			this.map!.fitBounds(this.imageBounds());
		});
	}

	/** The folder's other plans are dashed, so the target's own area stands out. */
	private renderArea(): void
	{
		this.areaLayer?.clearLayers();
		for (const area of this.areas) {
			if (area.points.length < 3) {
				continue;
			}
			const polygon = this.leaflet!.polygon(area.points.map(([x, y]) => this.worldToLatLng(x, y)), {
				pane: 'area',
				color: area.color,
				weight: 2,
				fillOpacity: area.primary ? 0.12 : 0.06,
				dashArray: area.primary ? undefined : '6 5',
				interactive: false,
			}).addTo(this.areaLayer!);
			if (area.label !== null) {
				polygon.bindTooltip(area.label, {permanent: true, direction: 'center', className: 'map-area-label'});
			}
		}
	}

	private applyDrafting(): void
	{
		const map = this.map!;
		map.getContainer().classList.toggle('map-drafting', this.drafting || this.measuring);
		if (this.drafting || this.measuring) {
			map.closePopup();
			map.doubleClickZoom.disable();
		} else {
			map.doubleClickZoom.enable();
		}
	}

	private renderDraft(): void
	{
		const leaflet = this.leaflet!;
		this.draftLayer?.clearLayers();
		this.rubberBand = null;
		if (!this.drafting || this.draft.length === 0) {
			return;
		}
		const corners = this.draft.map(([x, y]) => this.worldToLatLng(x, y));
		const style = {pane: 'draft', color: MapViewComponent.AREA_COLOR, weight: 2, interactive: false};
		leaflet.polyline(corners, style).addTo(this.draftLayer!);
		this.rubberBand = leaflet.polyline([corners[corners.length - 1], corners[corners.length - 1]], {...style, dashArray: '4 6'}).addTo(this.draftLayer!);
		corners.forEach((corner, index) => leaflet.circleMarker(corner, {
			...style,
			radius: index === 0 ? 6 : 4,
			fillColor: index === 0 ? '#fff' : MapViewComponent.AREA_COLOR,
			fillOpacity: 1,
		}).addTo(this.draftLayer!));
	}

	private onDraftClick(position: Leaflet.LatLng): void
	{
		if (!this.drafting) {
			return;
		}
		const map = this.map!;
		const clicked = map.latLngToContainerPoint(position);
		const distance = (corner: readonly [number, number]): number => map.latLngToContainerPoint(this.worldToLatLng(...corner)).distanceTo(clicked);
		if (this.draft.length >= 3 && distance(this.draft[0]) <= MapViewComponent.CLOSE_DISTANCE) {
			this.zone.run(() => this.draftClose.emit());
			return;
		}
		if (this.draft.length > 0 && distance(this.draft[this.draft.length - 1]) <= MapViewComponent.DUPLICATE_DISTANCE) {
			return;
		}
		this.zone.run(() => this.draftPoint.emit(this.toWorld(position)));
	}

	private syncMarkers(): void
	{
		if (this.map === null) {
			return;
		}
		this.clustered = this.shouldCluster();
		// The taken and collected states are in the key: a marker marked by hand is drawn anew, dimmed.
		const wanted = new Map<string, () => Leaflet.Layer>();
		const singles = this.clustered ? this.cluster(wanted) : this.markers;
		for (const marker of singles) {
			wanted.set(`${marker.layer}:${marker.id}:${marker.taken}:${marker.collected}`, () => this.createMarker(marker));
		}
		for (const [key, layer] of this.markerLayers) {
			if (!wanted.has(key)) {
				layer.remove();
				this.markerLayers.delete(key);
			}
		}
		for (const [key, create] of wanted) {
			if (!this.markerLayers.has(key)) {
				this.markerLayers.set(key, create());
			}
		}
	}

	private shouldCluster(): boolean
	{
		return this.clusters && this.map !== null && this.map.getZoom() < this.background.maxZoom - MapViewComponent.CLUSTER_LEVELS;
	}

	/** Groups markers of every layer on one screen grid, so bubbles never stack; returns those left single. Players are never grouped. */
	private cluster(wanted: Map<string, () => Leaflet.Layer>): MapMarker[]
	{
		const scale = Math.pow(2, this.map!.getZoom() - this.background.maxZoom) / MapViewComponent.CLUSTER_CELL;
		const cells = new Map<string, MapMarker[]>();
		const singles: MapMarker[] = [];
		for (const marker of this.markers) {
			if (marker.kind === 'player') {
				singles.push(marker);
				continue;
			}
			const [px, py] = this.background.worldToImage(marker.x, marker.y);
			const key = `${Math.floor(px * scale)}|${Math.floor(py * scale)}`;
			const cell = cells.get(key);
			if (cell === undefined) {
				cells.set(key, [marker]);
			} else {
				cell.push(marker);
			}
		}
		for (const [key, members] of cells) {
			if (members.length < MapViewComponent.CLUSTER_MIN) {
				singles.push(...members);
			} else {
				wanted.set(`cluster:${key}:${members.length}`, () => this.createCluster(members));
			}
		}
		return singles;
	}

	/** The ring is split by what is inside, so a bubble of mixed resources still shows which ones. */
	private createCluster(members: MapMarker[]): Leaflet.Layer
	{
		const leaflet = this.leaflet!;
		const first = members[0];
		const x = members.reduce((sum, marker) => sum + marker.x, 0) / members.length;
		const y = members.reduce((sum, marker) => sum + marker.y, 0) / members.length;
		const groups = new Map<string, {label: string; color: string; count: number}>();
		for (const member of members) {
			const key = member.groupKey ?? member.title;
			const group = groups.get(key);
			if (group === undefined) {
				groups.set(key, {label: member.groupLabel || member.title, color: member.color, count: 1});
			} else {
				group.count++;
			}
		}
		const sorted = [...groups.values()].sort((a, b) => b.count - a.count);
		let angle = 0;
		const stops = sorted.map(group => {
			const start = angle;
			angle += group.count / members.length * 360;
			return `${group.color} ${start.toFixed(1)}deg ${angle.toFixed(1)}deg`;
		});
		const marker = leaflet.marker(this.worldToLatLng(x, y), {
			icon: leaflet.divIcon({
				className: members.every(member => member.taken || member.collected) ? 'map-cluster-icon map-cluster-dim' : 'map-cluster-icon',
				html: `<span class="map-cluster" style="background: conic-gradient(${stops.join(', ')})"><span class="map-cluster-count">${members.length}</span></span>`,
				iconSize: [30, 30],
				iconAnchor: [15, 15],
			}),
			keyboard: false,
			title: sorted.slice(0, 6).map(group => `${group.count} × ${group.label}`).join('\n') + (sorted.length > 6 ? '\n…' : ''),
		}).addTo(this.nodeLayer!);
		marker.on('click', () => {
			const bounds = leaflet.latLngBounds(members.map(member => this.worldToLatLng(member.x, member.y)));
			this.map!.fitBounds(bounds, {padding: [48, 48], maxZoom: this.background.maxZoom - MapViewComponent.CLUSTER_LEVELS});
		});
		return marker;
	}

	private clearMarkers(): void
	{
		for (const layer of this.markerLayers.values()) {
			layer.remove();
		}
		this.markerLayers.clear();
	}

	private createMarker(marker: MapMarker): Leaflet.Layer
	{
		const leaflet = this.leaflet!;
		const [px, py] = this.background.worldToImage(marker.x, marker.y);
		const position = this.toLatLng(px, py);
		const layer = marker.kind === 'collectible'
			? this.canvasIcons!.create(position, marker, this.collectibleRenderer!).addTo(this.map!)
			: leaflet.marker(position, {
				icon: this.icons!.icon(marker, this.symbols),
				keyboard: false,
				zIndexOffset: marker.purity === null ? 0 : MapViewComponent.PURITY_Z_OFFSET[marker.purity],
			}).addTo(this.nodeLayer!);
		if (marker.kind === 'collectible') {
			layer.on('click', () => this.markerClicked = true);
		}
		return layer.bindPopup(() => this.popup.build(marker, this.coordinates, this.marksEditable ? kind => this.toggleMark(marker, kind) : null), {
			className: 'map-popup',
			autoPanPadding: [16, 16],
		});
	}

	private toggleMark(marker: MapMarker, kind: 'taken' | 'collected'): void
	{
		this.map?.closePopup();
		this.zone.run(() => this.markToggle.emit({id: marker.id, kind, on: kind === 'taken' ? !marker.taken : !marker.collected}));
	}

	private applyBackground(): void
	{
		const leaflet = this.leaflet!;
		const map = this.map!;
		this.tiles?.remove();

		const bounds = this.imageBounds();
		this.tiles = leaflet.tileLayer(this.background.tileUrlTemplate, {
			tileSize: this.background.tileSize,
			minZoom: this.background.minZoom - 4,
			maxNativeZoom: this.background.maxZoom,
			maxZoom: this.background.maxZoom + MapViewComponent.EXTRA_ZOOM,
			noWrap: true,
			bounds,
		}).addTo(map);
		map.setMaxZoom(this.background.maxZoom + MapViewComponent.EXTRA_ZOOM);
		// Panning may leave the image only partly: half a map of slack keeps the edges reachable without losing the map.
		map.setMaxBounds(bounds.pad(0.5));
	}

	private showInitialView(): void
	{
		const map = this.map;
		const size = map?.getSize();
		if (!this.pendingInitialView || map === null || size === undefined || size.x === 0 || size.y === 0) {
			return;
		}
		// Small panels must still be able to show the whole map.
		map.setMinZoom(Math.min(this.background.minZoom, Math.floor(map.getBoundsZoom(this.imageBounds()) * 4) / 4));
		if (this.view !== null) {
			this.applyView(this.view);
		} else {
			map.fitBounds(this.imageBounds(), {animate: false});
		}
		this.pendingInitialView = false;
		// A focus asked for before the map had a size wins over the saved view.
		this.applyFocus();
	}

	private applyFocus(): void
	{
		if (this.focus === null || this.focus.length === 0) {
			return;
		}
		const bounds = this.leaflet!.latLngBounds(this.focus.map(([x, y]) => this.worldToLatLng(x, y)));
		this.map!.fitBounds(bounds, {padding: [40, 40], maxZoom: this.background.maxZoom});
	}

	private applyView(view: MapView): void
	{
		const [px, py] = this.background.worldToImage(view.x, view.y);
		this.map!.setView(this.toLatLng(px, py), view.zoom, {animate: false});
	}

	private currentView(): MapView | null
	{
		if (this.map === null) {
			return null;
		}
		const point = this.map.project(this.map.getCenter(), this.background.maxZoom);
		const [x, y] = this.background.imageToWorld(point.x, point.y);
		return new MapView(x, y, this.map.getZoom());
	}

	private imageBounds(): Leaflet.LatLngBounds
	{
		return this.leaflet!.latLngBounds(this.toLatLng(0, 0), this.toLatLng(this.background.size, this.background.size));
	}

	private toWorld(position: Leaflet.LatLng): [number, number]
	{
		const point = this.map!.project(position, this.background.maxZoom);
		return this.background.imageToWorld(point.x, point.y);
	}

	private worldToLatLng(x: number, y: number): Leaflet.LatLng
	{
		const [px, py] = this.background.worldToImage(x, y);
		return this.toLatLng(px, py);
	}

	/** Full-size image pixels sit at the deepest native zoom, where one map unit is one image pixel. */
	private toLatLng(px: number, py: number): Leaflet.LatLng
	{
		return this.map!.unproject(this.leaflet!.point(px, py), this.background.maxZoom);
	}

}
