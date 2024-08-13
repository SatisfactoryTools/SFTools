import {Component, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	templateUrl: './VersionContextComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		RouterOutlet,
	],
})
export class VersionContextComponent implements OnDestroy
{

	protected readonly data;

	public constructor(protected readonly versionManager: VersionManager)
	{
		this.data = this.versionManager.versionDataResource;
	}

	public ngOnDestroy(): void
	{
		this.versionManager.clearActiveVersion();
	}

}
