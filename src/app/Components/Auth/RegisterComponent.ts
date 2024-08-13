import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {OAuthProviderButtonsComponent} from '@src/Components/Auth/OAuthProviderButtonsComponent';
import {AuthApiService} from '@src/Model/API/AuthApiService';

/**
 * Account creation. Signing up through a third-party provider is the primary
 * path (the sign-in flow creates unknown accounts on the fly; Steam is
 * excluded because it reports no email); the classic username/password form
 * is kept as a secondary, folded-away option.
 */
@Component({
	selector: 'auth-register',
	templateUrl: './RegisterComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, RouterLink, OAuthProviderButtonsComponent],
})
export class RegisterComponent
{

	public showClassicForm = false;

	public login = '';
	public email = '';
	public password = '';
	public loading = false;
	public error = '';
	public success = false;

	public constructor(private readonly authApiService: AuthApiService)
	{
	}

	public submit(): void
	{
		this.error = '';
		this.loading = true;
		this.authApiService.register(this.login, this.email, this.password).subscribe({
			next: () => {
				this.success = true;
				this.loading = false;
			},
			error: (err: HttpErrorResponse) => {
				this.error = (err.error as {error?: string})?.error ?? 'Registration failed. Please try again.';
				this.loading = false;
			},
		});
	}

}
