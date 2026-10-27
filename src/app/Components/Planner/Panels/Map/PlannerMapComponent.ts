import {ChangeDetectionStrategy, Component, computed} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faUpRightFromSquare} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {MapLocation} from '@src/Components/Map/MapLocation';
import {MapTargetSource} from '@src/Components/Map/MapTargetSource';
import {PageMapLocation} from '@src/Components/Map/PageMapLocation';
import {PageMapTargetSource} from '@src/Components/Map/PageMapTargetSource';
import {PanelMapTargetSource} from '@src/Components/Map/PanelMapTargetSource';
import {PanelMapLocation} from '@src/Components/Map/PanelMapLocation';
import {WorldMapComponent} from '@src/Components/Map/WorldMapComponent';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'planner-map',
	templateUrl: './PlannerMapComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [
		{provide: MapLocation, useClass: PanelMapLocation},
		{provide: MapTargetSource, useClass: PanelMapTargetSource},
	],
	imports: [RouterLink, FaIconComponent, AppTooltipDirective, WorldMapComponent],
	styles: `
		:host {
			display: block;
			height: 100%;
		}
	`,
})
export class PlannerMapComponent
{

	public readonly faUpRightFromSquare = faUpRightFromSquare;

	public readonly popOutLink = computed<string[] | null>(() => {
		const version = this.versionManager.activeVersion();
		return version === null ? null : ['/', this.versionManager.urlSlug(version), 'map'];
	});

	public readonly popOutQueryParams = computed(() => ({
		...this.location.queryParams(PageMapLocation.PARAMS),
		...PageMapTargetSource.queryParams(this.targets.target()),
	}));

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly location: MapLocation,
		private readonly targets: MapTargetSource,
		public readonly layout: PanelLayoutService,
	)
	{
	}

}
