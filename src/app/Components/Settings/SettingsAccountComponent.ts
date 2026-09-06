import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {faUser} from '@fortawesome/free-solid-svg-icons';

/** "Account" settings section - sign-in status and the sign-in reminder switch. */
@Component({
	selector: 'settings-account',
	templateUrl: './SettingsAccountComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, RouterLink, SettingsSectionComponent, InfoNoteComponent],
})
export class SettingsAccountComponent
{

	public readonly sectionIcon = faUser;

	public constructor(
		private readonly settings: SettingsManager,
		protected readonly auth: AuthService,
		protected readonly account: AccountProfileService,
	)
	{
	}

	public get signInPrompts(): boolean
	{
		return this.settings.account().signInPrompts;
	}

	public setSignInPrompts(value: boolean): void
	{
		this.settings.updateAccount({signInPrompts: value});
	}

}
