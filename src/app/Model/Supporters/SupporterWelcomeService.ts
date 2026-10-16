import {Injectable, Signal, computed, signal} from '@angular/core';
import {Observable} from 'rxjs';
import {AccountProfile} from '@src/Model/API/Schema/Account/AccountProfile';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {NotificationService} from '@src/Model/NotificationService';

/** Shown once per account (the server records the answer), not once per device. */
@Injectable({providedIn: 'root'})
export class SupporterWelcomeService
{

	private readonly closedSignal = signal(false);

	public readonly visible: Signal<boolean> = computed(() => {
		const supporter = this.account.supporter();
		return supporter !== null && !supporter.welcomed && !this.closedSignal() && this.connectivity.online();
	});

	public constructor(
		private readonly account: AccountProfileService,
		private readonly connectivity: ConnectivityService,
		private readonly notifications: NotificationService,
	)
	{
	}

	public save(listName: string | null): Observable<AccountProfile>
	{
		return this.account.updateSupporter({welcomed: true, listed: listName !== null, listName});
	}

	/** Closing without an answer keeps the name off the list. */
	public dismiss(): void
	{
		this.closedSignal.set(true);
		this.account.updateSupporter({welcomed: true}).subscribe({
			error: () => this.notifications.show('Could not save your answer. The thank-you note comes back next time.'),
		});
	}

	public close(): void
	{
		this.closedSignal.set(true);
	}

}
