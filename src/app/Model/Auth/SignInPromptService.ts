import {Injectable, Signal, computed, effect, signal} from '@angular/core';
import {AuthService} from '@src/Model/Auth/AuthService';
import {NotificationService} from '@src/Model/NotificationService';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {AppStorage} from '@src/Model/Storage/AppStorage';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';

const SESSION_KEY = 'sftools.signInPrompt.shown';
const SNOOZE_KEY = 'sftools.signInPrompt.snoozedUntil';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

@Injectable({providedIn: 'root'})
export class SignInPromptService
{

	private readonly visibleSignal = signal(false);
	private shownThisLoad = false;
	public readonly visible: Signal<boolean> = this.visibleSignal.asReadonly();

	public readonly enabled: Signal<boolean> = computed(
		() => !this.auth.isAuthenticated() && this.settings.account().signInPrompts && this.connectivity.online(),
	);

	public constructor(
		private readonly auth: AuthService,
		private readonly settings: SettingsManager,
		private readonly notifications: NotificationService,
		private readonly storage: AppStorage,
		private readonly connectivity: ConnectivityService,
	)
	{
		effect(() => {
			if (!this.enabled()) {
				this.visibleSignal.set(false);
			}
		});
	}

	public maybePrompt(): void
	{
		if (!this.enabled() || this.shownThisSession()) {
			return;
		}
		const snoozedUntil = Number(this.storage.getItem(SNOOZE_KEY) ?? 0);
		if (Number.isFinite(snoozedUntil) && snoozedUntil > Date.now()) {
			return;
		}
		this.markShown();
		this.visibleSignal.set(true);
	}

	public continueWithout(): void
	{
		this.storage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
		this.visibleSignal.set(false);
	}

	public hide(): void
	{
		this.visibleSignal.set(false);
	}

	public disable(): void
	{
		this.settings.updateAccount({signInPrompts: false});
		this.visibleSignal.set(false);
		this.notifications.showSuccess('Sign-in reminders are off. You can turn them back on in Settings → Account.');
	}

	// With site data blocked sessionStorage throws a SecurityError, so the prompt is then remembered for this page load only.
	private shownThisSession(): boolean
	{
		try {
			return this.shownThisLoad || sessionStorage.getItem(SESSION_KEY) !== null;
		} catch {
			return this.shownThisLoad;
		}
	}

	private markShown(): void
	{
		this.shownThisLoad = true;
		try {
			sessionStorage.setItem(SESSION_KEY, '1');
		} catch {
			// The flag above covers this page load.
		}
	}

}
