import {Component, ChangeDetectionStrategy, effect, signal, untracked} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHeart} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {SupporterProfileUpdate} from '@src/Model/API/Schema/Account/SupporterProfileUpdate';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {CommunityLinks} from '@src/Model/CommunityLinks';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {NotificationService} from '@src/Model/NotificationService';

/** Stored on the account rather than in the settings: the list name and share badge are read by the server for other people. */
@Component({
	selector: 'settings-supporter',
	templateUrl: './SettingsSupporterComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [DatePipe, FaIconComponent, FormsModule, RouterLink, InfoNoteComponent, SettingsSectionComponent],
	styles: [`
		.supporter-heart {
			color: #e8b83f;
		}
	`],
})
export class SettingsSupporterComponent
{

	public readonly sectionIcon = faHeart;
	public readonly faHeart = faHeart;

	public readonly donationLinks = CommunityLinks.DONATIONS;

	public listName = '';

	private readonly savingSignal = signal(false);
	public readonly saving = this.savingSignal.asReadonly();

	public constructor(
		protected readonly account: AccountProfileService,
		protected readonly auth: AuthService,
		protected readonly connectivity: ConnectivityService,
		private readonly notifications: NotificationService,
	)
	{
		effect(() => {
			const supporter = this.account.supporter();
			untracked(() => {
				this.listName = supporter?.listName ?? this.account.name() ?? '';
			});
		});
	}

	public setListed(listed: boolean): void
	{
		const name = this.listName.trim();
		if (listed && name === '') {
			this.notifications.show('Enter the name to show on the list first.');
			return;
		}
		this.save(listed ? {listed, listName: name} : {listed});
	}

	public saveListName(): void
	{
		const name = this.listName.trim();
		const supporter = this.account.supporter();
		if (supporter === null || name === (supporter.listName ?? '')) {
			return;
		}
		if (name === '') {
			if (supporter.listed) {
				this.notifications.show('The list needs a name. Turn the list off to hide your name instead.');
				this.listName = supporter.listName ?? '';
				return;
			}
			this.save({listName: null});
			return;
		}
		this.save({listName: name});
	}

	public save(update: SupporterProfileUpdate): void
	{
		this.savingSignal.set(true);
		this.account.updateSupporter(update).subscribe({
			next: () => this.savingSignal.set(false),
			error: () => {
				this.savingSignal.set(false);
				this.notifications.show('Could not save the supporter settings.');
			},
		});
	}

}
