import {Component, ChangeDetectionStrategy} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {AuthLayoutComponent} from '@src/Components/Auth/AuthLayoutComponent';
import {OAuthProviderButtonsComponent} from '@src/Components/Auth/OAuthProviderButtonsComponent';
import {AuthApiService} from '@src/Model/API/AuthApiService';
import {AuthReturnUrlService} from '@src/Model/Auth/AuthReturnUrlService';
import {AuthService} from '@src/Model/Auth/AuthService';

/**
 * Sign-in page. Third-party providers are the primary option; the
 * username/password form is kept as a secondary, folded-away path. Steam
 * cannot create accounts, so its button carries a warning. An optional
 * `returnUrl` query parameter says where to go afterwards - and where
 * "continue without signing in" leads; `method=password` opens the password
 * form straight away (links that already say "username & password" use it).
 */
@Component({
	selector: 'auth-login',
	templateUrl: './LoginComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, RouterLink, AuthLayoutComponent, OAuthProviderButtonsComponent, InfoNoteComponent],
})
export class LoginComponent
{

	public showPasswordForm = false;

	public login = '';
	public password = '';
	public loading = false;
	public error = '';

	public readonly returnUrl: string;

	public constructor(
		private readonly authApiService: AuthApiService,
		private readonly authService: AuthService,
		private readonly router: Router,
		route: ActivatedRoute,
	)
	{
		this.returnUrl = AuthReturnUrlService.sanitize(route.snapshot.queryParamMap.get('returnUrl'));
		this.showPasswordForm = route.snapshot.queryParamMap.get('method') === 'password';
	}

	public submit(): void
	{
		this.error = '';
		this.loading = true;
		this.authApiService.login(this.login, this.password).subscribe({
			next: (response) => {
				this.authService.storeSession(this.login, response);
				void this.router.navigateByUrl(this.returnUrl);
			},
			error: (err: HttpErrorResponse) => {
				this.error = (err.error as {error?: string})?.error ?? 'Login failed. Please try again.';
				this.loading = false;
			},
		});
	}

	public continueWithout(): void
	{
		void this.router.navigateByUrl(this.returnUrl);
	}

}
