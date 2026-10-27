import type * as Leaflet from 'leaflet';
import {CanvasIconLayer} from '@src/Components/Map/CanvasIconLayer';
import {MapMarker} from '@src/Model/Map/MapMarker';

/**
 * Icon markers for thousands of collectibles: Leaflet's canvas renderer draws a circle marker by calling its
 * `_updatePath`, so overriding that draws the icon instead while keeping the renderer's batching and click hit testing.
 */
export class MapCanvasIcons
{

	private static readonly BACKDROP = 'rgba(20, 24, 36, 0.85)';
	private static readonly PILL_FONT = '700 10px Lato, sans-serif';
	private static readonly PILL_HEIGHT = 13;

	private readonly layerClass: new (position: Leaflet.LatLngExpression, options: Leaflet.CircleMarkerOptions) => CanvasIconLayer;
	private readonly images = new Map<string, HTMLImageElement>();
	private readonly waiting = new Map<string, Set<CanvasIconLayer>>();

	public symbols = false;

	public constructor(leaflet: typeof Leaflet)
	{
		const icons = this;
		const prototype = leaflet.CircleMarker.prototype as unknown as {_project(this: CanvasIconLayer): void};
		this.layerClass = (leaflet.CircleMarker as unknown as {extend(members: object): MapCanvasIcons['layerClass']}).extend({
			_project(this: CanvasIconLayer): void
			{
				// Smaller when zoomed out, where thousands of full-size icons would bury the map.
				this._radius = icons.radius(this._map.getZoom());
				prototype._project.call(this);
			},
			_updatePath(this: CanvasIconLayer): void
			{
				icons.draw(this);
			},
		});
	}

	public create(position: Leaflet.LatLng, marker: MapMarker, renderer: Leaflet.Canvas): Leaflet.CircleMarker
	{
		const layer = new this.layerClass(position, {renderer, radius: 9, interactive: true});
		layer.marker = marker;
		return layer as unknown as Leaflet.CircleMarker;
	}

	private radius(zoom: number): number
	{
		return this.symbols ? 4.5 : Math.max(6, Math.min(13, 6 + zoom * 1.5));
	}

	private draw(layer: CanvasIconLayer): void
	{
		if (layer._empty()) {
			return;
		}
		const context = layer._renderer._ctx;
		const {x, y} = layer._point;
		const radius = layer._radius;
		// Collected ones stay findable, but read as done.
		context.save();
		context.globalAlpha = layer.marker.collected ? 0.4 : 1;
		this.drawMarker(context, layer, x, y, radius);
		context.restore();
	}

	private drawMarker(context: CanvasRenderingContext2D, layer: CanvasIconLayer, x: number, y: number, radius: number): void
	{

		if (this.symbols) {
			context.beginPath();
			context.arc(x, y, radius, 0, Math.PI * 2);
			context.fillStyle = layer.marker.color;
			context.fill();
			context.lineWidth = 1.5;
			context.strokeStyle = '#111';
			context.stroke();
			return;
		}

		context.beginPath();
		context.arc(x, y, radius, 0, Math.PI * 2);
		context.fillStyle = MapCanvasIcons.BACKDROP;
		context.fill();
		context.lineWidth = 2;
		context.strokeStyle = layer.marker.color;
		context.stroke();

		const image = layer.marker.iconUrl === null ? null : this.image(layer.marker.iconUrl, layer);
		if (image !== null) {
			const size = radius * 1.55;
			context.drawImage(image, x - size / 2, y - size / 2, size, size);
		} else {
			context.beginPath();
			context.arc(x, y, radius * 0.45, 0, Math.PI * 2);
			context.fillStyle = layer.marker.color;
			context.fill();
		}

		if (layer.marker.amount !== null && layer.marker.amount > 1) {
			this.drawAmount(context, layer.marker.amount, x + radius * 0.55, y + radius * 0.55);
		}
	}

	private drawAmount(context: CanvasRenderingContext2D, amount: number, x: number, y: number): void
	{
		const text = String(amount);
		context.font = MapCanvasIcons.PILL_FONT;
		const width = Math.max(MapCanvasIcons.PILL_HEIGHT, context.measureText(text).width + 7);
		const height = MapCanvasIcons.PILL_HEIGHT;
		const left = x - width / 2;
		const top = y - height / 2;

		context.beginPath();
		context.roundRect(left, top, width, height, height / 2);
		context.fillStyle = '#111';
		context.fill();
		context.lineWidth = 1;
		context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
		context.stroke();

		context.fillStyle = '#fff';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText(text, x, y + 0.5);
	}

	private image(url: string, layer: CanvasIconLayer): HTMLImageElement | null
	{
		const existing = this.images.get(url);
		if (existing !== undefined) {
			if (existing.complete && existing.naturalWidth > 0) {
				return existing;
			}
			this.waiting.get(url)?.add(layer);
			return null;
		}

		const image = new Image();
		this.images.set(url, image);
		this.waiting.set(url, new Set([layer]));
		image.onload = () => {
			const layers = this.waiting.get(url);
			this.waiting.delete(url);
			layers?.forEach(waiting => waiting.redraw());
		};
		image.onerror = () => this.waiting.delete(url);
		image.src = url;
		return null;
	}

}
