import {Injectable, Signal} from '@angular/core';
import {MapTarget} from '@src/Model/Map/MapTarget';

@Injectable()
export abstract class MapTargetSource
{

	public abstract readonly target: Signal<MapTarget | null>;

	/** The planner already shows which plan is open; a map page on its own has to. */
	public abstract readonly selectable: boolean;

}
