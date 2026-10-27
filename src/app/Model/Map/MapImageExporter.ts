import {Injectable} from '@angular/core';
import {faIndustry, faUser} from '@fortawesome/free-solid-svg-icons';
import {MapAreaOutline} from '@src/Model/Map/MapAreaOutline';
import {MapBackground} from '@src/Model/Map/MapBackground';
import {MapExportOptions} from '@src/Model/Map/MapExportOptions';
import {MapImageOverlay} from '@src/Model/Map/MapImageOverlay';
import {MapMarker} from '@src/Model/Map/MapMarker';
import {MapMarkerShapes} from '@src/Model/Map/MapMarkerShapes';
import {MapPin} from '@src/Model/Map/MapPin';

/** Draws the map on a canvas of its own: Leaflet's tiles, DOM markers and canvas layers cannot be captured as one picture. */
@Injectable({providedIn: 'root'})
export class MapImageExporter
{

	/** Browsers refuse larger canvases, or draw them blank. */
	public static readonly MAX_SIDE = 8192;

	private static readonly BACKGROUND = '#141824';

	/** Tiles loaded at once: the whole map at full size is a thousand of them, too many to hold together. */
	private static readonly TILE_BATCH = 32;

	private readonly shapes = new MapMarkerShapes();

	public async export(
		background: MapBackground,
		options: MapExportOptions,
		markers: ReadonlyArray<MapMarker>,
		areas: ReadonlyArray<MapAreaOutline>,
		pins: ReadonlyArray<MapPin>,
		heatmap: MapImageOverlay | null,
	): Promise<Blob>
	{
		const [x0, y0, x1, y1] = options.bounds;
		const width = Math.min(MapImageExporter.MAX_SIDE, Math.round(options.width));
		const scale = width / (x1 - x0);
		const height = Math.min(MapImageExporter.MAX_SIDE, Math.round((y1 - y0) * scale));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		// willReadFrequently keeps the canvas in main memory: a full-size map as one GPU texture loses the graphics context, which leaves a blank picture.
		const context = canvas.getContext('2d', {willReadFrequently: true});
		if (context === null) {
			throw new Error('The picture could not be drawn.');
		}
		context.fillStyle = MapImageExporter.BACKGROUND;
		context.fillRect(0, 0, width, height);

		const project = (wx: number, wy: number): [number, number] => {
			const [px, py] = background.worldToImage(wx, wy);
			return [(px - x0) * scale, (py - y0) * scale];
		};

		await this.drawTiles(context, background, options.bounds, scale);
		if (heatmap !== null) {
			const image = await this.load(heatmap.url);
			if (image !== null) {
				const [left, top] = project(heatmap.minX, heatmap.minY);
				const [right, bottom] = project(heatmap.maxX, heatmap.maxY);
				context.globalAlpha = 0.55;
				context.drawImage(image, left, top, right - left, bottom - top);
				context.globalAlpha = 1;
			}
		}

		// Markers keep a readable size however large the picture is.
		const unit = Math.max(1, Math.min(4, width / 1600));
		for (const area of areas) {
			this.drawArea(context, area, project, unit);
		}
		for (const marker of markers.filter(marker => marker.kind === 'collectible')) {
			this.drawCollectible(context, marker, project, unit);
		}
		for (const marker of markers.filter(marker => marker.kind === 'node' || marker.kind === 'well' || marker.kind === 'geyser')) {
			this.drawNode(context, marker, project, unit);
		}
		for (const pin of pins) {
			const [x, y] = project(pin.x, pin.y);
			this.drawBadge(context, x, y, 11 * unit, pin.color, faIndustry.icon, pin.label, unit);
		}
		for (const marker of markers.filter(marker => marker.kind === 'player')) {
			const [x, y] = project(marker.x, marker.y);
			this.drawBadge(context, x, y, 10 * unit, marker.color, faUser.icon, marker.title, unit);
		}

		return new Promise((resolve, reject) => canvas.toBlob(
			blob => blob === null ? reject(new Error('The picture is too large for this browser.')) : resolve(blob),
			'image/png',
		));
	}

	/** The shallowest tiles that still have a pixel for each pixel of the picture. */
	private async drawTiles(context: CanvasRenderingContext2D, background: MapBackground, bounds: readonly [number, number, number, number], scale: number): Promise<void>
	{
		const [x0, y0, x1, y1] = bounds;
		const zoom = Math.max(background.minZoom, Math.min(background.maxZoom, background.maxZoom + Math.ceil(Math.log2(scale))));
		const factor = Math.pow(2, zoom - background.maxZoom);
		const tiles = Math.ceil(background.size * factor / background.tileSize);
		const tileWorld = background.tileSize / factor;
		const first = (value: number): number => Math.max(0, Math.floor(value / tileWorld));
		const last = (value: number): number => Math.min(tiles - 1, Math.floor(value / tileWorld));
		const tilesToDraw: [number, number][] = [];
		for (let tx = first(x0); tx <= last(x1 - 1); tx++) {
			for (let ty = first(y0); ty <= last(y1 - 1); ty++) {
				tilesToDraw.push([tx, ty]);
			}
		}
		for (let start = 0; start < tilesToDraw.length; start += MapImageExporter.TILE_BATCH) {
			await Promise.all(tilesToDraw.slice(start, start + MapImageExporter.TILE_BATCH).map(([tx, ty]) => {
				const url = background.tileUrlTemplate.replace('{z}', `${zoom}`).replace('{x}', `${tx}`).replace('{y}', `${ty}`);
				return this.load(url).then(image => {
					if (image !== null) {
						const size = tileWorld * scale;
						// Half a pixel of overlap hides the seams that rounding leaves between tiles.
						context.drawImage(image, (tx * tileWorld - x0) * scale, (ty * tileWorld - y0) * scale, size + 0.5, size + 0.5);
					}
				});
			}));
		}
	}

	private drawArea(context: CanvasRenderingContext2D, area: MapAreaOutline, project: (x: number, y: number) => [number, number], unit: number): void
	{
		if (area.points.length < 3) {
			return;
		}
		context.beginPath();
		area.points.forEach(([wx, wy], index) => {
			const [x, y] = project(wx, wy);
			if (index === 0) {
				context.moveTo(x, y);
			} else {
				context.lineTo(x, y);
			}
		});
		context.closePath();
		context.fillStyle = this.alpha(area.color, area.primary ? 0.12 : 0.08);
		context.fill();
		context.setLineDash(area.primary ? [] : [6 * unit, 5 * unit]);
		context.lineWidth = 2 * unit;
		context.strokeStyle = area.color;
		context.stroke();
		context.setLineDash([]);
	}

	private drawNode(context: CanvasRenderingContext2D, marker: MapMarker, project: (x: number, y: number) => [number, number], unit: number): void
	{
		const [x, y] = project(marker.x, marker.y);
		const size = (marker.kind === 'well' ? 14 : 18) * unit;
		const path = new Path2D(this.shapes.path(marker.purity ?? 'circle'));
		context.save();
		context.globalAlpha = marker.taken ? 0.45 : 1;
		context.translate(x - size / 2, y - size / 2);
		context.scale(size / 20, size / 20);
		context.lineJoin = 'round';
		context.lineWidth = 3.2;
		context.strokeStyle = '#111';
		context.stroke(path);
		context.fillStyle = marker.color;
		context.fill(path);
		context.lineWidth = 1.1;
		context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
		context.stroke(path);
		context.restore();
	}

	private drawCollectible(context: CanvasRenderingContext2D, marker: MapMarker, project: (x: number, y: number) => [number, number], unit: number): void
	{
		const [x, y] = project(marker.x, marker.y);
		context.globalAlpha = marker.collected ? 0.4 : 1;
		context.beginPath();
		context.arc(x, y, 4.5 * unit, 0, Math.PI * 2);
		context.fillStyle = marker.color;
		context.fill();
		context.lineWidth = 1.5 * unit;
		context.strokeStyle = '#111';
		context.stroke();
		context.globalAlpha = 1;
	}

	private drawBadge(
		context: CanvasRenderingContext2D,
		x: number,
		y: number,
		radius: number,
		color: string,
		icon: [number, number, string[], string, string | string[]],
		label: string,
		unit: number,
	): void
	{
		context.beginPath();
		context.arc(x, y, radius, 0, Math.PI * 2);
		context.fillStyle = color;
		context.fill();
		context.lineWidth = 2 * unit;
		context.strokeStyle = '#111';
		context.stroke();

		const [iconWidth, iconHeight, , , path] = icon;
		const size = radius * 1.1;
		const ratio = size / Math.max(iconWidth, iconHeight);
		context.save();
		context.translate(x - iconWidth * ratio / 2, y - iconHeight * ratio / 2);
		context.scale(ratio, ratio);
		context.fillStyle = '#111';
		context.fill(new Path2D(Array.isArray(path) ? path.join(' ') : path));
		context.restore();

		context.font = `700 ${Math.round(12 * unit)}px Lato, sans-serif`;
		context.textAlign = 'left';
		context.textBaseline = 'middle';
		context.lineWidth = 3 * unit;
		context.strokeStyle = 'rgba(17, 17, 17, 0.9)';
		context.strokeText(label, x + radius + 4 * unit, y);
		context.fillStyle = '#fff';
		context.fillText(label, x + radius + 4 * unit, y);
	}

	private alpha(color: string, alpha: number): string
	{
		const hex = color.replace('#', '');
		const value = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16);
		return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
	}

	/** Tiles come from the API's domain: without CORS the canvas could not be read back. */
	private load(url: string): Promise<HTMLImageElement | null>
	{
		return new Promise(resolve => {
			const image = new Image();
			image.crossOrigin = 'anonymous';
			image.onload = () => resolve(image);
			image.onerror = () => resolve(null);
			image.src = url;
		});
	}

}
