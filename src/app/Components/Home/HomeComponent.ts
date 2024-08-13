import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Version} from '@src/Model/API/Schema/Version';
import {AuthService} from '@src/Model/Auth/AuthService';
import {VersionManager} from '@src/Model/Data/VersionManager';

/** The landing page: project header, About link, and the game version picker (public + own custom). */
@Component({
	templateUrl: './HomeComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		RouterLink,
	],
})
export class HomeComponent
{

	public constructor(
		protected readonly versionManager: VersionManager,
		protected readonly auth: AuthService,
	)
	{
	}

	public get publicVersions(): Version[]
	{
		return this.versionManager.versions().filter(version => !version.custom);
	}

	public get customVersions(): Version[]
	{
		return this.versionManager.versions().filter(version => version.custom);
	}

	/** One-line description of a custom version: its base and the non-default modifiers. */
	public customSummary(version: Version): string
	{
		const base = this.versionManager.versions().find(candidate => candidate.id === version.baseVersion);
		const parts = base ? [`Based on ${base.name}`] : [];
		if (version.recipeCost !== 1) {
			parts.push(`recipe cost ×${version.recipeCost}`);
		}
		if (version.powerCost !== 1) {
			parts.push(`power cost ×${version.powerCost}`);
		}
		const modCount = version.mods?.length ?? 0;
		if (modCount > 0) {
			parts.push(`${modCount} mod${modCount === 1 ? '' : 's'}`);
		}
		return parts.join(' · ');
	}

}
