import {Injectable} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MapLocation} from '@src/Components/Map/MapLocation';
import {MapLocationParams} from '@src/Components/Map/MapLocationParams';

@Injectable()
export class PanelMapLocation extends MapLocation
{

	// Prefixed: the planner URL carries other panels' state too.
	public static readonly PARAMS: MapLocationParams = {view: 'map', layers: 'mapLayers'};

	public constructor(router: Router, route: ActivatedRoute)
	{
		super(router, route, PanelMapLocation.PARAMS);
	}

}
