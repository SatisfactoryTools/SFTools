import {Injectable} from '@angular/core';

const STORAGE_KEY = 'sftools.auth.returnUrl';

/**
 * Where to land after signing in. Third-party sign-in leaves the app for the
 * provider and comes back through /auth/callback, so the target survives in
 * sessionStorage; the password form reads it from the login page's
 * `returnUrl` query parameter through the same service. Only in-app paths
 * are accepted, and auth pages themselves never count as a destination.
 */
@Injectable({providedIn: 'root'})
export class AuthReturnUrlService
{

	public remember(url: string | null): void
	{
		sessionStorage.setItem(STORAGE_KEY, AuthReturnUrlService.sanitize(url));
	}

	/** The remembered destination (home when none), cleared on read. */
	public consume(): string
	{
		const url = sessionStorage.getItem(STORAGE_KEY);
		sessionStorage.removeItem(STORAGE_KEY);
		return AuthReturnUrlService.sanitize(url);
	}

	/** Reduces anything that is not a safe in-app path to the home page. */
	public static sanitize(url: string | null): string
	{
		if (url === null || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/auth/')) {
			return '/';
		}
		return url;
	}

}
