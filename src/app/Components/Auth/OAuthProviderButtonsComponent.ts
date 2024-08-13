import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {OAuthProviderInfo} from '@src/Model/Auth/OAuthProviderInfo';
import {OAuthProviders} from '@src/Model/Auth/OAuthProviders';

/**
 * The third-party sign-in/sign-up buttons, shared by the login and register
 * pages: renders the enabled providers in priority order and starts the
 * OAuth redirect on click. Signing in and signing up are the same flow -
 * an unknown account is created on the fly - so only the wording differs.
 * Steam can be excluded (it cannot create accounts).
 */
@Component({
	selector: 'oauth-provider-buttons',
	templateUrl: './OAuthProviderButtonsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
})
export class OAuthProviderButtonsComponent
{

	/** Button prefix, e.g. "Sign in with" or "Sign up with". */
	@Input() public verb = 'Sign in with';
	@Input() public includeSteam = true;

	/** Enabled providers in display order; filled from the API. */
	public providers: OAuthProviderInfo[] = [];
	/** Key of the provider whose redirect is being prepared. */
	public startingProvider: string | null = null;
	public error: string | null = null;

	public constructor(private readonly oauthApiService: OAuthApiService)
	{
		this.oauthApiService.getProviders().subscribe({
			next: response => {
				const enabled = new Set(response.providers);
				this.providers = OAuthProviders.ALL.filter(provider => enabled.has(provider.key));
			},
			error: () => this.error = 'Third-party sign-in is unavailable right now.',
		});
	}

	public get displayedProviders(): OAuthProviderInfo[]
	{
		return this.includeSteam ? this.providers : this.providers.filter(provider => provider.key !== 'steam');
	}

	public start(provider: OAuthProviderInfo): void
	{
		if (this.startingProvider !== null) {
			return;
		}
		this.error = null;
		this.startingProvider = provider.key;
		this.oauthApiService.start(provider.key, false).subscribe({
			next: response => window.location.href = response.authorizationUrl,
			error: () => {
				this.error = `Could not start ${provider.label} sign-in. Please try again.`;
				this.startingProvider = null;
			},
		});
	}

}
