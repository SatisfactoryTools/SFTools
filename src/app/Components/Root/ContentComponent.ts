import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NavbarComponent} from '@src/Components/Root/NavbarComponent';
import {SettingsConflictDialogComponent} from '@src/Components/Settings/SettingsConflictDialogComponent';
import {NotificationService} from '@src/Model/NotificationService';

@Component({
	templateUrl: './ContentComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		RouterOutlet,
		NavbarComponent,
		SettingsConflictDialogComponent,
	],
})
export class ContentComponent
{

	public constructor(public readonly notifications: NotificationService)
	{
	}

}
