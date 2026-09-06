import {Component, ChangeDetectionStrategy, effect} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DatePipe} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleUser} from '@fortawesome/free-solid-svg-icons';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {OAuthConnection} from '@src/Model/API/Schema/Auth/OAuthConnection';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {OAuthProviderInfo} from '@src/Model/Auth/OAuthProviderInfo';
import {OAuthProviders} from '@src/Model/Auth/OAuthProviders';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';

/**
 * Account settings: the profile (avatar, resolved name, self-chosen display
 * name - see account-and-plan-counts.md) and the user's sign-in methods. Lists all supported
 * providers with connect (link flow - same OAuth redirect, started with the
 * Bearer token) and disconnect; the backend refuses to remove the last
 * sign-in method, mirrored here through the canDisconnect flag.
 */
@Component({
	templateUrl: './AccountComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [DatePipe, FormsModule, FaIconComponent, BackLinkComponent],
	styles: [`
		.avatar {
			width: 64px;
			height: 64px;
			border-radius: 50%;
			object-fit: cover;
			flex-shrink: 0;
		}
		.avatar-placeholder {
			width: 64px;
			height: 64px;
			border-radius: 50%;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: rgba(76, 155, 232, 0.16);
			color: #4c9be8;
			font-size: 2rem;
			flex-shrink: 0;
		}
	`],
})
export class AccountComponent
{

	public readonly allProviders = OAuthProviders.ALL;
	public readonly faCircleUser = faCircleUser;

	/** The display-name field; seeded from the profile until the user types. */
	public displayNameDraft = '';
	private draftTouched = false;
	public savingName = false;
	public nameError: string | null = null;
	public nameSaved = false;

	public hasPassword = false;
	public connections: OAuthConnection[] = [];
	public loading = true;
	public loadError = false;
	public error: string | null = null;
	/** Label of the provider that was just linked (from the callback redirect). */
	public justLinked: string | null = null;
	public startingProvider: string | null = null;

	public constructor(
		private readonly oauthApiService: OAuthApiService,
		protected readonly authService: AuthService,
		protected readonly account: AccountProfileService,
		route: ActivatedRoute,
	)
	{
		effect(() => {
			const profile = this.account.profile();
			if (profile !== null && !this.draftTouched) {
				this.displayNameDraft = profile.displayName ?? '';
			}
		});
		const linked = route.snapshot.queryParamMap.get('linked');
		this.justLinked = linked ? OAuthProviders.labelOf(linked) : null;
		this.reload();
	}

	private reload(): void
	{
		this.oauthApiService.getConnections().subscribe({
			next: response => {
				this.hasPassword = response.hasPassword;
				this.connections = response.connections;
				this.loading = false;
			},
			error: () => {
				this.loadError = true;
				this.loading = false;
			},
		});
	}

	public onDraftChange(): void
	{
		this.draftTouched = true;
		this.nameSaved = false;
	}

	/** What the greeting falls back to without a display name - shown as the field's placeholder. */
	public get fallbackName(): string
	{
		const profile = this.account.profile();
		if (profile === null) {
			return '';
		}
		if (profile.hasPassword) {
			return profile.login;
		}
		return profile.connections.find(connection => connection.nickname !== null)?.nickname ?? profile.login;
	}

	public saveDisplayName(): void
	{
		this.persistDisplayName(this.displayNameDraft.trim() === '' ? null : this.displayNameDraft.trim());
	}

	public clearDisplayName(): void
	{
		this.displayNameDraft = '';
		this.persistDisplayName(null);
	}

	private persistDisplayName(displayName: string | null): void
	{
		if (this.savingName) {
			return;
		}
		this.savingName = true;
		this.nameError = null;
		this.nameSaved = false;
		this.account.updateDisplayName(displayName).subscribe({
			next: profile => {
				this.savingName = false;
				this.nameSaved = true;
				this.draftTouched = false;
				this.displayNameDraft = profile.displayName ?? '';
			},
			error: (err: HttpErrorResponse) => {
				this.savingName = false;
				this.nameError = (err.error as {error?: string})?.error ?? 'Could not save the display name.';
			},
		});
	}

	public connectionOf(provider: OAuthProviderInfo): OAuthConnection | null
	{
		return this.connections.find(connection => connection.provider === provider.key) ?? null;
	}

	public connect(provider: OAuthProviderInfo): void
	{
		if (this.startingProvider !== null) {
			return;
		}
		this.error = null;
		this.startingProvider = provider.key;
		this.oauthApiService.start(provider.key, true).subscribe({
			next: response => window.location.href = response.authorizationUrl,
			error: () => {
				this.error = `Could not start connecting ${provider.label}.`;
				this.startingProvider = null;
			},
		});
	}

	public disconnect(provider: OAuthProviderInfo): void
	{
		if (!confirm(`Disconnect ${provider.label} from your account?`)) {
			return;
		}
		this.error = null;
		this.oauthApiService.disconnect(provider.key).subscribe({
			next: () => this.reload(),
			error: (err: HttpErrorResponse) => {
				this.error = (err.error as {error?: string})?.error ?? `Could not disconnect ${provider.label}.`;
			},
		});
	}

}
