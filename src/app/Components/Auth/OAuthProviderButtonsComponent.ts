import {Component, ChangeDetectionStrategy, Input, OnDestroy} from '@angular/core';
import {Subscription} from 'rxjs';
import {Router} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';
import {AuthReturnUrlService} from '@src/Model/Auth/AuthReturnUrlService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {DesktopOAuthFlow} from '@src/Model/Auth/DesktopOAuthFlow';
import {OAuthProviderInfo} from '@src/Model/Auth/OAuthProviderInfo';
import {OAuthProviders} from '@src/Model/Auth/OAuthProviders';

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
export class OAuthProviderButtonsComponent implements OnDestroy
{

	@Input() public verb = 'Sign in with';
	@Input() public includeSteam = true;
	@Input() public returnUrl: string | null = null;

	public providers: OAuthProviderInfo[] = [];
	public loading = true;
	public startingProvider: string | null = null;
	public error: string | null = null;
	private desktopFlow: Subscription | null = null;

	public constructor(
		private readonly oauthApiService: OAuthApiService,
		private readonly authReturnUrl: AuthReturnUrlService,
		private readonly router: Router,
		private readonly authService: AuthService,
		protected readonly desktopOAuth: DesktopOAuthFlow,
	)
	{
		this.oauthApiService.getProviders().subscribe({
			next: response => {
				const enabled = new Set(response.providers);
				this.providers = OAuthProviders.ALL.filter(provider => enabled.has(provider.key));
				this.loading = false;
			},
			error: () => {
				this.error = 'Signing in with these services is not possible right now.';
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
		if (this.desktopOAuth.available) {
			this.startInBrowser(provider);
			return;
		}
		this.oauthApiService.start(provider.key, false).subscribe({
			next: response => window.location.href = response.authorizationUrl,
			error: () => {
				this.error = `Could not start ${provider.label} sign-in. Please try again.`;
				this.startingProvider = null;
			},
		});
	}

	public cancel(): void
	{
		this.desktopFlow?.unsubscribe();
		this.desktopFlow = null;
		this.startingProvider = null;
	}

	public ngOnDestroy(): void
	{
		this.desktopFlow?.unsubscribe();
	}

	private startInBrowser(provider: OAuthProviderInfo): void
	{
		this.desktopFlow = this.desktopOAuth.run(provider.key, false).subscribe({
			next: response => {
				this.desktopFlow = null;
				// No username for third-party sign-ins; the navbar shows the provider instead.
				this.authService.storeSession(`via ${provider.label}`, response as TokenResponse);
				void this.router.navigateByUrl(this.authReturnUrl.consume());
			},
			error: (err: Error) => {
				this.desktopFlow = null;
				this.error = err.message;
				this.startingProvider = null;
			},
		});
	}

}
