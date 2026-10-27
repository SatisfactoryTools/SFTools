import {faUser} from '@fortawesome/free-solid-svg-icons';
import type * as Leaflet from 'leaflet';
import {MapMarker} from '@src/Model/Map/MapMarker';
import {MapMarkerShapes} from '@src/Model/Map/MapMarkerShapes';

export class MapMarkerIcons
{

	private static readonly NODE_SIZE = 18;
	private static readonly WELL_SIZE = 14;
	private static readonly NODE_ICON_SIZE = 28;
	private static readonly WELL_ICON_SIZE = 22;
	private static readonly PLAYER_SIZE = 24;

	private readonly shapes = new MapMarkerShapes();
	private readonly cache = new Map<string, Leaflet.DivIcon>();

	public constructor(private readonly leaflet: typeof Leaflet)
	{
	}

	public icon(marker: MapMarker, symbols: boolean): Leaflet.DivIcon
	{
		if (marker.kind === 'player') {
			return this.player(marker);
		}
		const well = marker.kind === 'well';
		const pictured = !symbols && marker.iconUrl !== null;
		const key = `${marker.purity}|${marker.color}|${well}|${pictured ? marker.iconUrl : ''}|${marker.taken}`;
		let icon = this.cache.get(key);
		if (icon === undefined) {
			const size = pictured
				? (well ? MapMarkerIcons.WELL_ICON_SIZE : MapMarkerIcons.NODE_ICON_SIZE)
				: (well ? MapMarkerIcons.WELL_SIZE : MapMarkerIcons.NODE_SIZE);
			icon = this.leaflet.divIcon({
				className: marker.taken ? 'map-node-icon map-node-taken' : 'map-node-icon',
				html: pictured ? this.pictureSvg(marker, size) : this.symbolSvg(marker, size, well),
				iconSize: [size, size],
				iconAnchor: [size / 2, size / 2],
				popupAnchor: [0, -size / 2],
			});
			this.cache.set(key, icon);
		}
		return icon;
	}

	/** Not cached: every player has their own name on it. */
	private player(marker: MapMarker): Leaflet.DivIcon
	{
		const [width, height, , , path] = faUser.icon;
		const label = document.createElement('span');
		label.className = 'map-player-name';
		label.textContent = marker.title;
		return this.leaflet.divIcon({
			className: 'map-player-icon',
			html: `<span class="map-player-disc" style="--marker-color: ${marker.color}">`
				+ `<svg viewBox="0 0 ${width} ${height}" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="${path}"/></svg></span>`
				+ label.outerHTML,
			iconSize: [MapMarkerIcons.PLAYER_SIZE, MapMarkerIcons.PLAYER_SIZE],
			iconAnchor: [MapMarkerIcons.PLAYER_SIZE / 2, MapMarkerIcons.PLAYER_SIZE / 2],
			popupAnchor: [0, -MapMarkerIcons.PLAYER_SIZE / 2],
		});
	}

	// A dark rim with a light edge inside keeps the marker readable on both the pale ground and the dark sea.
	private symbolSvg(marker: MapMarker, size: number, well: boolean): string
	{
		const path = this.shapes.path(marker.purity ?? 'circle');
		const centre = well ? '<circle cx="10" cy="10.5" r="2.2" fill="#111"/>' : '';
		return `<svg width="${size}" height="${size}" viewBox="-1.5 -1.5 23 23" aria-hidden="true">`
			+ `<path d="${path}" fill="none" stroke="#111" stroke-width="3.2" stroke-linejoin="round"/>`
			+ `<path d="${path}" fill="${marker.color}" stroke="rgba(255,255,255,0.9)" stroke-width="1.1" stroke-linejoin="round"/>`
			+ centre
			+ '</svg>';
	}

	// The resource's own icon in a disc ringed with its colour; purity is the same shape as in symbol mode, as a corner badge.
	private pictureSvg(marker: MapMarker, size: number): string
	{
		const url = marker.iconUrl!.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
		const badge = marker.purity === null ? '' : this.shapes.path(marker.purity);
		return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" aria-hidden="true">`
			+ `<circle cx="13" cy="13" r="11.5" fill="rgba(20,24,36,0.88)" stroke="${marker.color}" stroke-width="2.5"/>`
			+ `<image href="${url}" x="4.5" y="4.5" width="17" height="17"/>`
			+ (badge === '' ? '' : '<g transform="translate(16.5 16.5) scale(0.55)">'
				+ `<path d="${badge}" fill="none" stroke="#111" stroke-width="4.5" stroke-linejoin="round"/>`
				+ `<path d="${badge}" fill="#fff" stroke="none"/>`
				+ '</g>')
			+ '</svg>';
	}

}
