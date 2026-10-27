import {MapSearchEntry} from '@src/Model/Map/MapSearchEntry';
import {SearchFragment} from '@src/Model/Search/SearchFragment';

export interface MapSearchResult
{
	readonly entry: MapSearchEntry;
	readonly fragments: SearchFragment[];
}
