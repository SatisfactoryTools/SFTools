import {Component, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';
import {AuthService} from '@src/Model/Auth/AuthService';
import {OAuthProviders} from '@src/Model/Auth/OAuthProviders';

/**
 * Landing page of the OAuth redirect (/auth/callback/{provider}): forwards
 * every query parameter the provider sent to the backend callback endpoint,
 * then either stores the token pair (sign-in) or returns to the account page
 * (link flow). The state and code are single-use, so this runs exactly once.
 */
@Component({
	templateUrl: './OAuthCallbackComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink],
})
export class OAuthCallbackComponent
{

	public readonly providerLabel: string;
	public error: string | null = null;

	public constructor(
		private readonly oauthApiService: OAuthApiService,
		private readonly authService: AuthService,
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
				if (response.linked) {
					// Link flow - already signed in; back to the connections screen.
					void this.router.navigate(['/account'], {queryParams: {linked: provider}});
					return;
				}
				// There is no username to show for third-party sign-ins; the
				// navbar displays the provider instead.
				this.authService.storeSession(`via ${this.providerLabel}`, response as TokenResponse);
				void this.router.navigate(['/']);
			},
			error: (err: HttpErrorResponse) => {
				this.error = (err.error as {error?: string})?.error ?? `Signing in with ${this.providerLabel} failed. Please try again.`;
			},
		});
	}

}
