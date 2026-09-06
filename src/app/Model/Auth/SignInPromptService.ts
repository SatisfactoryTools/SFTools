import {Injectable, Signal, computed, effect, signal} from '@angular/core';
import {AuthService} from '@src/Model/Auth/AuthService';
import {NotificationService} from '@src/Model/NotificationService';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

const SESSION_KEY = 'sftools.signInPrompt.shown';
const SNOOZE_KEY = 'sftools.signInPrompt.snoozedUntil';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

/**
 * Decides when to nudge a signed-out user towards an account. The nudges
 * (planner prompt dialog, home page panel) are all gated by the
 * `account.signInPrompts` setting, so one switch turns them off; the dialog
 * additionally shows at most once per browser session and rests for a day
 * after "continue without signing in". Signing in hides everything.
 */
@Injectable({providedIn: 'root'})
export class SignInPromptService
{

	private readonly visibleSignal = signal(false);
	/** The planner prompt dialog is open. */
	public readonly visible: Signal<boolean> = this.visibleSignal.asReadonly();

	/** Sign-in nudges apply: signed out and reminders not turned off. */
	public readonly enabled: Signal<boolean> = computed(
		() => !this.auth.isAuthenticated() && this.settings.account().signInPrompts,
	);

	public constructor(
		private readonly auth: AuthService,
		private readonly settings: SettingsManager,
		private readonly notifications: NotificationService,
	)
	{
		effect(() => {
			if (!this.enabled()) {
				this.visibleSignal.set(false);
			}
		});
	}

	/** Opens the prompt if the user is signed out, reminders are on, and it has not shown recently. */
	public maybePrompt(): void
	{
		if (!this.enabled() || sessionStorage.getItem(SESSION_KEY) !== null) {
			return;
		}
		const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
		if (Number.isFinite(snoozedUntil) && snoozedUntil > Date.now()) {
			return;
		}
		sessionStorage.setItem(SESSION_KEY, '1');
		this.visibleSignal.set(true);
	}

	/** "Continue without signing in" - closes the prompt and rests it for a day. */
	public continueWithout(): void
	{
		localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
		this.visibleSignal.set(false);
	}

	/** Closes the prompt without snoozing - the user is heading to the sign-in page. */
	public hide(): void
	{
		this.visibleSignal.set(false);
	}

	/** "Don't ask again" - flips the setting off, from the prompt or the home panel. */
	public disable(): void
	{
		this.settings.updateAccount({signInPrompts: false});
		this.visibleSignal.set(false);
		this.notifications.showSuccess('Sign-in reminders are off. You can turn them back on under Settings → Account.');
	}

}
