import {Injectable} from '@angular/core';
import {Router, UrlTree} from '@angular/router';
import {AuthService} from '@src/Model/Auth/AuthService';

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
