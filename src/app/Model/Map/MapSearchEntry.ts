import {MapSearchAction} from '@src/Model/Map/MapSearchAction';

export interface MapSearchEntry
{
	readonly id: string;
	readonly label: string;
	readonly detail: string;
	/** A short tag: what kind of thing it is. */
	readonly kind: string;
	readonly color: string | null;
	readonly iconUrl: string | null;
	readonly action: MapSearchAction;
}
