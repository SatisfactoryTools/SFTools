import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {AuthApiService} from '@src/Model/API/AuthApiService';
import {AuthService} from '@src/Model/Auth/AuthService';

/** Best effort: a failed revoke call must not keep the user signed in. */
@Injectable({providedIn: 'root'})
export class LogoutService
{

	public constructor(
		private readonly authService: AuthService,
		private readonly authApiService: AuthApiService,
		private readonly router: Router,
	)
	{
	}

	public logout(): void
	{
		const refreshToken = this.authService.getRefreshToken() ?? undefined;
		this.authApiService.logout(refreshToken).subscribe({
			next: () => this.finish(),
			error: () => this.finish(),
		});
	}

	private finish(): void
	{
		this.authService.clearSession();
		void this.router.navigate(['/']);
	}

}
