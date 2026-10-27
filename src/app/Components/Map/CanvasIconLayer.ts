import type * as Leaflet from 'leaflet';
import {MapMarker} from '@src/Model/Map/MapMarker';

// The Leaflet internals the drawing hooks into, beside the marker it draws.
export interface CanvasIconLayer
{
	marker: MapMarker;
	redraw(): void;
	_map: Leaflet.Map;
	_point: Leaflet.Point;
	_radius: number;
	_renderer: {_ctx: CanvasRenderingContext2D};
	_empty(): boolean;
}
