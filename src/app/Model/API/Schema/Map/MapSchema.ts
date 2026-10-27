import {MapBoundsSchema} from '@src/Model/API/Schema/Map/MapBoundsSchema';

export interface MapSchema
{
	id: string;
	gameVersion: string;
	size: number;
	tileSize: number;
	minZoom: number;
	maxZoom: number;
	format: string;
	world: MapBoundsSchema;
	icons?: Record<string, string>;
}
