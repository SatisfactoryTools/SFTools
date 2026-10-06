import {Injectable} from '@angular/core';

const STORAGE_KEY = 'sftools.auth.returnUrl';

@Injectable({providedIn: 'root'})
export class AuthReturnUrlService
{

	public remember(url: string | null): void
	{
		sessionStorage.setItem(STORAGE_KEY, AuthReturnUrlService.sanitize(url));
	}

	public consume(): string
	{
		const url = sessionStorage.getItem(STORAGE_KEY);
		sessionStorage.removeItem(STORAGE_KEY);
		return AuthReturnUrlService.sanitize(url);
	}

	public static sanitize(url: string | null): string
	{
		if (url === null || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/auth/')) {
			return '/';
		}
		return url;
	}

}
