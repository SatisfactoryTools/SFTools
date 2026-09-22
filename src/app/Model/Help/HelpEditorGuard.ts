import {Injectable} from '@angular/core';
import {Router, UrlTree} from '@angular/router';
import {Observable, of} from 'rxjs';
import {map, catchError} from 'rxjs/operators';
import {AccountApiService} from '@src/Model/API/AccountApiService';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {AuthService} from '@src/Model/Auth/AuthService';

/**
 * Blocks the help editor for everyone but accounts with the help-editor flag.
 * The profile may not have arrived yet when the route activates, so the guard
 * asks the API directly rather than guessing from an empty signal.
 */
@Injectable({providedIn: 'root'})
export class HelpEditorGuard
{

	public constructor(
		private readonly auth: AuthService,
		private readonly profile: AccountProfileService,
		private readonly api: AccountApiService,
		private readonly router: Router,
	)
	{
	}

	public canActivate(): boolean | UrlTree | Observable<boolean | UrlTree>
	{
		if (!this.auth.isAuthenticated()) {
			return this.router.createUrlTree(['/auth/login']);
		}
		if (this.profile.helpEditor()) {
			return true;
		}

		return this.api.getProfile().pipe(
			map(profile => profile.helpEditor ? true : this.router.createUrlTree(['/help'])),
			catchError(() => of(this.router.createUrlTree(['/help']))),
		);
	}

}
