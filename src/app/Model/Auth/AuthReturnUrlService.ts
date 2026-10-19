import {Injectable} from '@angular/core';

const STORAGE_KEY = 'sftools.auth.returnUrl';

@Injectable({providedIn: 'root'})
export class AuthReturnUrlService
{

	// With site data blocked sessionStorage throws a SecurityError; sign-in then just returns home.
	public remember(url: string | null): void
	{
		try {
			sessionStorage.setItem(STORAGE_KEY, AuthReturnUrlService.sanitize(url));
		} catch {
			// Nothing to remember it in.
		}
	}

	public consume(): string
	{
		try {
			const url = sessionStorage.getItem(STORAGE_KEY);
			sessionStorage.removeItem(STORAGE_KEY);
			return AuthReturnUrlService.sanitize(url);
		} catch {
			return '/';
		}
	}

	public static sanitize(url: string | null): string
	{
		if (url === null || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/auth/')) {
			return '/';
		}
		return url;
	}

}
