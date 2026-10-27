import {Injectable} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MapLocation} from '@src/Components/Map/MapLocation';
import {MapLocationParams} from '@src/Components/Map/MapLocationParams';

@Injectable()
export class PageMapLocation extends MapLocation
{

	public static readonly PARAMS: MapLocationParams = {view: 'view', layers: 'layers'};

	public constructor(router: Router, route: ActivatedRoute)
	{
		super(router, route, PageMapLocation.PARAMS);
	}

}
