import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCodeBranch, faList} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'version-switcher',
	templateUrl: './NavbarVersionSwitcherComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		AppTooltipDirective,
		BsDropdownModule,
		FaIconComponent,
		RouterLink,
	],
})
export class NavbarVersionSwitcherComponent
{

	public readonly faCodeBranch = faCodeBranch;
	public readonly faList = faList;

	public constructor(protected readonly versionManager: VersionManager)
	{
	}

	public gameVersionsTooltip(version: Version): string
	{
		const range = this.versionManager.gameVersionRange(version);
		return range ? `Game versions ${range}` : '';
	}

}
