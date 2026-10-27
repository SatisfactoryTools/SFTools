import {MapLayerId} from '@src/Model/Map/MapLayerId';

/** A category is shown and zoomed to; a layer only turned on, for collectibles that are not loaded yet; points are zoomed to and ringed, markers too after their layer is turned on. */
export type MapSearchAction =
	| {readonly type: 'category'; readonly layer: MapLayerId; readonly ids: ReadonlyArray<string>; readonly groupKey: string}
	| {readonly type: 'layer'; readonly layer: MapLayerId}
	| {readonly type: 'points'; readonly points: ReadonlyArray<readonly [number, number]>}
	| {readonly type: 'markers'; readonly layer: MapLayerId; readonly points: ReadonlyArray<readonly [number, number]>};
