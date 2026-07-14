import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {NavbarComponent} from '@src/Components/Root/NavbarComponent';
import {SettingsConflictDialogComponent} from '@src/Components/Settings/SettingsConflictDialogComponent';
import {NotificationService} from '@src/Model/NotificationService';

@Component({
	templateUrl: './ContentComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		FaIconComponent,
		RouterOutlet,
		NavbarComponent,
		SettingsConflictDialogComponent,
	],
})
export class ContentComponent
{

	public readonly faXmark = faXmark;

	public constructor(public readonly notifications: NotificationService)
	{
	}

}
