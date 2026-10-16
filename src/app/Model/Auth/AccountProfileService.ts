import {Injectable, Signal, computed, effect, signal, untracked} from '@angular/core';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {AccountApiService} from '@src/Model/API/AccountApiService';
import {AccountProfile} from '@src/Model/API/Schema/Account/AccountProfile';
import {SupporterProfile} from '@src/Model/API/Schema/Account/SupporterProfile';
import {SupporterProfileUpdate} from '@src/Model/API/Schema/Account/SupporterProfileUpdate';
import {AuthService} from '@src/Model/Auth/AuthService';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const ACCENT_KEY = 'sftools.supporter.accent';

@Injectable({providedIn: 'root'})
export class AccountProfileService
{

	private readonly profileSignal = signal<AccountProfile | null>(null);
	public readonly profile: Signal<AccountProfile | null> = this.profileSignal.asReadonly();

	public readonly name: Signal<string | null> = computed(() => this.profile()?.name ?? this.auth.displayName());
	public readonly avatarUrl: Signal<string | null> = computed(() => this.profile()?.avatarUrl ?? null);

	public readonly helpEditor: Signal<boolean> = computed(() => this.profile()?.helpEditor ?? false);

	public readonly supporter: Signal<SupporterProfile | null> = computed(() => this.profile()?.supporter ?? null);

	/** Remembered from the last profile, so a supporter's navbar does not flash orange until the profile arrives. */
	private readonly cachedAccent: boolean;

	public readonly supporterAccent: Signal<boolean> = computed(() => {
		if (!this.auth.isAuthenticated()) {
			return false;
		}
		const profile = this.profile();
		return profile === null ? this.cachedAccent : profile.supporter?.accent === true;
	});

	public readonly supporterNameHeart: Signal<boolean> = computed(() => this.supporter()?.nameHeart === true);

	public constructor(
		private readonly auth: AuthService,
		private readonly api: AccountApiService,
		private readonly storage: AppStorage,
	)
	{
		this.cachedAccent = storage.getItem(ACCENT_KEY) === '1';

		effect(() => {
			if (this.auth.isAuthenticated()) {
				untracked(() => this.load());
			} else {
				this.profileSignal.set(null);
				untracked(() => this.storage.removeItem(ACCENT_KEY));
			}
		});
	}

	public load(): void
	{
		this.api.getProfile().subscribe({
			next: profile => this.setProfile(profile),
			// An older backend without the endpoint just leaves the login-based fallback in place.
			error: () => undefined,
		});
	}

	public updateDisplayName(displayName: string | null): Observable<AccountProfile>
	{
		return this.api.updateDisplayName(displayName).pipe(tap(profile => this.setProfile(profile)));
	}

	public updateSupporter(update: SupporterProfileUpdate): Observable<AccountProfile>
	{
		return this.api.updateSupporter(update).pipe(tap(profile => this.setProfile(profile)));
	}

	private setProfile(profile: AccountProfile): void
	{
		this.profileSignal.set(profile);
		if (profile.supporter?.accent === true) {
			this.storage.setItem(ACCENT_KEY, '1');
		} else {
			this.storage.removeItem(ACCENT_KEY);
		}
	}

}
