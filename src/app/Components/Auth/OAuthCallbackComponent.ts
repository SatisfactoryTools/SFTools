import {Component, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthLayoutComponent} from '@src/Components/Auth/AuthLayoutComponent';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';
import {AuthReturnUrlService} from '@src/Model/Auth/AuthReturnUrlService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {OAuthProviders} from '@src/Model/Auth/OAuthProviders';

@Component({
	templateUrl: './OAuthCallbackComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink, AuthLayoutComponent],
})
export class OAuthCallbackComponent
{

	public readonly providerLabel: string;
	public error: string | null = null;
	public completedForDesktop = false;

	public constructor(
		private readonly oauthApiService: OAuthApiService,
		private readonly authService: AuthService,
		private readonly authReturnUrl: AuthReturnUrlService,
		private readonly router: Router,
		route: ActivatedRoute,
	)
	{
		const provider = route.snapshot.paramMap.get('provider') ?? '';
		this.providerLabel = OAuthProviders.labelOf(provider);

		const params: Record<string, string> = {};
		route.snapshot.queryParamMap.keys.forEach(key => {
			params[key] = route.snapshot.queryParamMap.get(key) ?? '';
		});

		this.oauthApiService.callback(provider, params).subscribe({
			next: response => {
				if (response.desktop) {
					this.completedForDesktop = true;
					return;
				}
				if (response.linked) {
					void this.router.navigate(['/account'], {queryParams: {linked: provider}});
					return;
				}
				// No username for third-party sign-ins; the navbar shows the provider instead.
				this.authService.storeSession(`via ${this.providerLabel}`, response as TokenResponse);
				void this.router.navigateByUrl(this.authReturnUrl.consume());
			},
			error: (err: HttpErrorResponse) => {
				this.error = (err.error as {error?: string})?.error ?? `Signing in with ${this.providerLabel} failed. Please try again.`;
			},
		});
	}

}
