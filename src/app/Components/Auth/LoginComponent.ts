import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {OAuthProviderButtonsComponent} from '@src/Components/Auth/OAuthProviderButtonsComponent';
import {AuthApiService} from '@src/Model/API/AuthApiService';
import {AuthService} from '@src/Model/Auth/AuthService';

/**
 * Sign-in page. Third-party providers are the primary option; the
 * username/password form is kept as a secondary, folded-away path. Steam
 * cannot create accounts, so its button carries a warning.
 */
@Component({
	selector: 'auth-login',
	templateUrl: './LoginComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, RouterLink, OAuthProviderButtonsComponent],
})
export class LoginComponent
{

	public showPasswordForm = false;

	public login = '';
	public password = '';
	public loading = false;
	public error = '';

	public constructor(
		private readonly authApiService: AuthApiService,
		private readonly authService: AuthService,
		private readonly router: Router,
	)
	{
	}

	public submit(): void
	{
		this.error = '';
		this.loading = true;
		this.authApiService.login(this.login, this.password).subscribe({
			next: (response) => {
				this.authService.storeSession(this.login, response);
				void this.router.navigate(['/']);
			},
			error: (err: HttpErrorResponse) => {
				this.error = (err.error as {error?: string})?.error ?? 'Login failed. Please try again.';
				this.loading = false;
			},
		});
	}

}
