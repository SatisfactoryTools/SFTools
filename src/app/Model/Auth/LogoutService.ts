import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {AuthApiService} from '@src/Model/API/AuthApiService';
import {AuthService} from '@src/Model/Auth/AuthService';

/**
 * Signing out, shared by the navbar user menu and the home page welcome card:
 * revokes the refresh token server-side (best effort - a failed call must not
 * keep the user signed in), clears the local session and returns home.
 */
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
