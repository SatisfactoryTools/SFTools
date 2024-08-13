import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Router, RouterLink, ActivatedRoute} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthApiService} from '@src/Model/API/AuthApiService';

@Component({
	selector: 'auth-reset-password',
	templateUrl: './ResetPasswordComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, RouterLink],
})
export class ResetPasswordComponent
{

	public password = '';
	public loading = false;
	public error = '';
	public success = false;

	private readonly token: string;

	public constructor(
		private readonly authApiService: AuthApiService,
		private readonly router: Router,
		route: ActivatedRoute,
	)
	{
		this.token = route.snapshot.queryParamMap.get('token') ?? '';
	}

	public submit(): void
	{
		if (!this.token) {
			this.error = 'Reset token is missing. Please use the link from your email.';
			return;
		}
		this.error = '';
		this.loading = true;
		this.authApiService.resetPassword(this.token, this.password).subscribe({
			next: () => {
				this.success = true;
				this.loading = false;
			},
			error: (err: HttpErrorResponse) => {
				this.error = (err.error as {error?: string})?.error ?? 'Password reset failed. Please try again.';
				this.loading = false;
			},
		});
	}

}
