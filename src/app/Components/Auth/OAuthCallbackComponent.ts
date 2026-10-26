import {Component, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {AuthLayoutComponent} from '@src/Components/Auth/AuthLayoutComponent';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {OAuthCallbackResponse} from '@src/Model/API/Schema/Auth/OAuthCallbackResponse';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';
import {AuthReturnUrlService} from '@src/Model/Auth/AuthReturnUrlService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {OAuthFlowStore} from '@src/Model/Auth/OAuthFlowStore';
import {OAuthPendingFlow} from '@src/Model/Auth/OAuthPendingFlow';
import {OAuthProviders} from '@src/Model/Auth/OAuthProviders';
import {AppLinks} from '@src/Model/Desktop/AppLinks';

@Component({
	templateUrl: './OAuthCallbackComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, RouterLink, AuthLayoutComponent],
})
export class OAuthCallbackComponent
{

	public readonly providerLabel: string;
	public error: string | null = null;
	public completedForDesktop = false;
	public confirmRequired = false;
	public confirming = false;
	public confirmError: string | null = null;
	public code = '';
	public readonly appLink: string;
	private readonly provider: string;
	private readonly params: Record<string, string> = {};
	private readonly flow: OAuthPendingFlow | null;

	public constructor(
		private readonly oauthApiService: OAuthApiService,
		private readonly authService: AuthService,
		private readonly authReturnUrl: AuthReturnUrlService,
		private readonly router: Router,
		flowStore: OAuthFlowStore,
		route: ActivatedRoute,
	)
	{
		this.provider = route.snapshot.paramMap.get('provider') ?? '';
		this.providerLabel = OAuthProviders.labelOf(this.provider);

		route.snapshot.queryParamMap.keys.forEach(key => {
			this.params[key] = route.snapshot.queryParamMap.get(key) ?? '';
		});
		this.appLink = AppLinks.desktopUrl(`/auth/callback/${encodeURIComponent(this.provider)}?${new URLSearchParams(this.params).toString()}`);
		this.flow = flowStore.take(this.params['state'] ?? '', this.provider);

		this.send(null);
	}

	public confirm(): void
	{
		if (this.confirming || this.code.trim() === '') {
			return;
		}
		this.confirming = true;
		this.confirmError = null;
		this.send(this.code);
	}

	private send(confirmCode: string | null): void
	{
		this.oauthApiService.callback(this.provider, this.params, this.flow !== null, this.flow?.link ?? false, confirmCode).subscribe({
			next: response => this.handle(response),
			error: (err: HttpErrorResponse) => {
				this.confirming = false;
				const body = err.error as OAuthCallbackResponse & {error?: string} | null;
				if (err.status === 409 && body?.confirmRequired) {
					this.confirmRequired = true;
					return;
				}
				const message = body?.error ?? `Signing in with ${this.providerLabel} failed. Please try again.`;
				if (this.confirmRequired && err.status === 400 && message.startsWith('The code does not match')) {
					this.confirmError = message;
					return;
				}
				this.confirmRequired = false;
				this.error = message;
			},
		});
	}

	private handle(response: OAuthCallbackResponse): void
	{
		this.confirming = false;
		this.confirmRequired = false;
		if (response.desktop) {
			this.completedForDesktop = true;
			return;
		}
		if (response.linked) {
			void this.router.navigate(['/account'], {queryParams: {linked: this.provider}});
			return;
		}
		// No username for third-party sign-ins; the navbar shows the provider instead.
		this.authService.storeSession(`via ${this.providerLabel}`, response as TokenResponse);
		void this.router.navigateByUrl(this.authReturnUrl.consume());
	}

}
