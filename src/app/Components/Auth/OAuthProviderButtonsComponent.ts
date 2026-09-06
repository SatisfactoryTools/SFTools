import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {Router} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {AuthReturnUrlService} from '@src/Model/Auth/AuthReturnUrlService';
import {OAuthProviderInfo} from '@src/Model/Auth/OAuthProviderInfo';
import {OAuthProviders} from '@src/Model/Auth/OAuthProviders';

/**
 * The third-party sign-in/sign-up buttons, shared by the login and register
 * pages and the sign-in prompt: renders the enabled providers in priority
 * order and starts the OAuth redirect on click. Signing in and signing up
 * are the same flow - an unknown account is created on the fly - so only the
 * wording differs. Steam can be excluded (it cannot create accounts). Before
 * leaving for the provider the current page (or `returnUrl`) is remembered,
 * so the callback lands the user back where they were.
 */
@Component({
	selector: 'oauth-provider-buttons',
	templateUrl: './OAuthProviderButtonsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
	styles: [`
		.provider-btn {
			--bs-btn-color: #fff;
			--bs-btn-bg: #2a4661;
			--bs-btn-border-color: #5d7189;
			--bs-btn-hover-color: #fff;
			--bs-btn-hover-bg: #365879;
			--bs-btn-hover-border-color: #7e95af;
			--bs-btn-active-bg: #3f668c;
			--bs-btn-active-border-color: #7e95af;
			--bs-btn-disabled-color: #9fb0c0;
			--bs-btn-disabled-bg: #2a4661;
			--bs-btn-disabled-border-color: #5d7189;
			display: flex;
			align-items: center;
			gap: 0.75rem;
			text-align: left;
		}
		.provider-icon {
			width: 1.5rem;
			font-size: 1.2rem;
			flex-shrink: 0;
			text-align: center;
		}
		.provider-label {
			flex-grow: 1;
			text-align: center;
		}
		.provider-spacer {
			width: 1.5rem;
			flex-shrink: 0;
		}
	`],
})
export class OAuthProviderButtonsComponent
{

	/** Button prefix, e.g. "Sign in with" or "Sign up with". */
	@Input() public verb = 'Sign in with';
	@Input() public includeSteam = true;
	/** Where to land after the provider round-trip; the current URL when unset. */
	@Input() public returnUrl: string | null = null;

	/** Enabled providers in display order; filled from the API. */
	public providers: OAuthProviderInfo[] = [];
	public loading = true;
	/** Key of the provider whose redirect is being prepared. */
	public startingProvider: string | null = null;
	public error: string | null = null;

	public constructor(
		private readonly oauthApiService: OAuthApiService,
		private readonly authReturnUrl: AuthReturnUrlService,
		private readonly router: Router,
	)
	{
		this.oauthApiService.getProviders().subscribe({
			next: response => {
				const enabled = new Set(response.providers);
				this.providers = OAuthProviders.ALL.filter(provider => enabled.has(provider.key));
				this.loading = false;
			},
			error: () => {
				this.error = 'Third-party sign-in is unavailable right now.';
				this.loading = false;
			},
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
		this.authReturnUrl.remember(this.returnUrl ?? this.router.url);
		this.oauthApiService.start(provider.key, false).subscribe({
			next: response => window.location.href = response.authorizationUrl,
			error: () => {
				this.error = `Could not start ${provider.label} sign-in. Please try again.`;
				this.startingProvider = null;
			},
		});
	}

}
