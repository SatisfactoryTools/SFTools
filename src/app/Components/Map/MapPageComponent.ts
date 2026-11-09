import {ChangeDetectionStrategy, Component, OnDestroy, effect} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {MapLocation} from '@src/Components/Map/MapLocation';
import {MapTargetComponent} from '@src/Components/Map/MapTargetComponent';
import {MapTargetSource} from '@src/Components/Map/MapTargetSource';
import {PageMapLocation} from '@src/Components/Map/PageMapLocation';
import {PageMapTargetSource} from '@src/Components/Map/PageMapTargetSource';
import {WorldMapComponent} from '@src/Components/Map/WorldMapComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {MapTopicCatalog} from '@src/Model/Map/MapTopicCatalog';
import {PageMetaService} from '@src/Model/Meta/PageMetaService';

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
export class MapPageComponent implements OnDestroy
{

	public constructor(route: ActivatedRoute, versionManager: VersionManager, private readonly pageMeta: PageMetaService)
	{
		// Each topic has its own route match, so the topic never changes while the page lives.
		const topic = MapTopicCatalog.find(route.snapshot.paramMap.get('topic') ?? '');
		if (topic !== null) {
			effect(() => {
				const version = versionManager.activeVersion()?.name ?? '';
				pageMeta.set({
					title: `${topic.heading} (${version})`,
					description: topic.description.replaceAll('{V}', version),
				});
			});
		}
	}

	public ngOnDestroy(): void
	{
		this.pageMeta.clear();
	}

}
