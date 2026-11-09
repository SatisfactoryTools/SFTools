import {Injectable} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MapLocation} from '@src/Components/Map/MapLocation';
import {MapLocationParams} from '@src/Components/Map/MapLocationParams';
import {MapLayerState} from '@src/Model/Map/MapLayerState';
import {MapTopicCatalog} from '@src/Model/Map/MapTopicCatalog';

@Injectable()
export class PageMapLocation extends MapLocation
{

	public static readonly PARAMS: MapLocationParams = {view: 'view', layers: 'layers'};

	public constructor(router: Router, route: ActivatedRoute)
	{
		const topic = MapTopicCatalog.find(route.snapshot.paramMap.get('topic') ?? '');
		super(router, route, PageMapLocation.PARAMS, topic !== null ? MapTopicCatalog.layers(topic) : MapLayerState.default());
	}

}
