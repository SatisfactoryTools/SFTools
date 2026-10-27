import {Injectable} from '@angular/core';
import type * as Leaflet from 'leaflet';

/** Leaflet is only needed once a map opens, so it is kept out of the main bundle. */
@Injectable({providedIn: 'root'})
export class LeafletLoader
{

	private loading: Promise<typeof Leaflet> | null = null;

	public load(): Promise<typeof Leaflet>
	{
		// Leaflet 1.x is CommonJS: depending on interop the namespace arrives directly or under `default`.
		this.loading ??= import('leaflet').then(module => (module as {default?: typeof Leaflet}).default ?? module);
		return this.loading;
	}

}
