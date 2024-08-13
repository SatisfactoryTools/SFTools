import {Component, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {OAuthConnection} from '@src/Model/API/Schema/Auth/OAuthConnection';
import {AuthService} from '@src/Model/Auth/AuthService';
import {OAuthProviderInfo} from '@src/Model/Auth/OAuthProviderInfo';
import {OAuthProviders} from '@src/Model/Auth/OAuthProviders';

/**
 * Account settings: the user's sign-in methods. Lists all supported
 * providers with connect (link flow - same OAuth redirect, started with the
 * Bearer token) and disconnect; the backend refuses to remove the last
 * sign-in method, mirrored here through the canDisconnect flag.
 */
@Component({
	templateUrl: './AccountComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [DatePipe, FaIconComponent],
})
export class AccountComponent
{

	public readonly allProviders = OAuthProviders.ALL;

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
		route: ActivatedRoute,
	)
	{
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
