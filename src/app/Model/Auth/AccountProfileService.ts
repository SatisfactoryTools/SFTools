import {Injectable, Signal, computed, effect, signal, untracked} from '@angular/core';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {AccountApiService} from '@src/Model/API/AccountApiService';
import {AccountProfile} from '@src/Model/API/Schema/Account/AccountProfile';
import {AuthService} from '@src/Model/Auth/AuthService';

/**
 * The signed-in user's profile, fetched once per session and after every
 * display-name change. `name` is what the UI greets the user with: the
 * server's resolved name (display name → login → provider nickname), falling
 * back to the locally stored login while the profile is still loading.
 */
@Injectable({providedIn: 'root'})
export class AccountProfileService
{

	private readonly profileSignal = signal<AccountProfile | null>(null);
	public readonly profile: Signal<AccountProfile | null> = this.profileSignal.asReadonly();

	public readonly name: Signal<string | null> = computed(() => this.profile()?.name ?? this.auth.displayName());
	public readonly avatarUrl: Signal<string | null> = computed(() => this.profile()?.avatarUrl ?? null);

	public constructor(
		private readonly auth: AuthService,
		private readonly api: AccountApiService,
	)
	{
		effect(() => {
			if (this.auth.isAuthenticated()) {
				untracked(() => this.load());
			} else {
				this.profileSignal.set(null);
			}
		});
	}

	public load(): void
	{
		this.api.getProfile().subscribe({
			next: profile => this.profileSignal.set(profile),
			// An older backend without the endpoint just leaves the login-based fallback in place.
			error: () => undefined,
		});
	}

	public updateDisplayName(displayName: string | null): Observable<AccountProfile>
	{
		return this.api.updateDisplayName(displayName).pipe(tap(profile => this.profileSignal.set(profile)));
	}

}
