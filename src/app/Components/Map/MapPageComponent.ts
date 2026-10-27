import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MapLocation} from '@src/Components/Map/MapLocation';
import {MapTargetComponent} from '@src/Components/Map/MapTargetComponent';
import {MapTargetSource} from '@src/Components/Map/MapTargetSource';
import {PageMapLocation} from '@src/Components/Map/PageMapLocation';
import {PageMapTargetSource} from '@src/Components/Map/PageMapTargetSource';
import {WorldMapComponent} from '@src/Components/Map/WorldMapComponent';

@Component({
	template: '<world-map class="h-100"><map-target mapTarget/></world-map>',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [
		{provide: MapLocation, useClass: PageMapLocation},
		PageMapTargetSource,
		{provide: MapTargetSource, useExisting: PageMapTargetSource},
	],
	imports: [MapTargetComponent, WorldMapComponent],
	host: {style: 'position: fixed; top: var(--navbar-height, 56px); left: 0; right: 0; bottom: 0; overflow: hidden;'},
})
export class MapPageComponent
{
}
