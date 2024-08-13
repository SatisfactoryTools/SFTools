import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCodeBranch, faList} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'version-switcher',
	templateUrl: './NavbarVersionSwitcherComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
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

}
