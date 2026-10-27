import {MapSiteLine} from '@src/Model/Map/MapSiteLine';

/** A spot being explained: a mark there and a line to each node it would use. */
export interface MapSiteFocus
{
	readonly x: number;
	readonly y: number;
	readonly lines: MapSiteLine[];
}
