import {Injectable} from '@angular/core';
import {Router, UrlTree} from '@angular/router';
import {AuthService} from '@src/Model/Auth/AuthService';

/** Blocks routes that require a signed-in user, sending guests to the login page. */
@Injectable({providedIn: 'root'})
export class AuthGuard
{

	public constructor(
		private readonly auth: AuthService,
		private readonly router: Router,
	)
	{
	}

	public canActivate(): boolean | UrlTree
	{
		return this.auth.isAuthenticated() ? true : this.router.createUrlTree(['/auth/login']);
	}

}
