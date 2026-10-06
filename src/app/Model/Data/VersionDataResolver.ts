import {Injectable} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {EMPTY, Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {ShareVersionLinker} from '@src/Model/Shares/ShareVersionLinker';

@Injectable({providedIn: 'root'})
export class VersionDataResolver
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly versionLinker: ShareVersionLinker,
		private readonly notifications: NotificationService,
		private readonly router: Router,
	)
	{
	}

	public resolve(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<null>
	{
		const slug = route.paramMap.get('versionSlug')!;
		const version = this.versionManager.findByUrlSlug(slug);

		if (!version)
		{
			// A link into someone else's custom version is the first this user hears of it, so link it the way the share route does.
			return this.versionLinker.ensure(slug).pipe(
				map(() => {
					this.versionManager.setActiveVersion(slug);
					return null;
				}),
				catchError((err: unknown) => {
					// A 404 is a dead link and going home says it all; a server that did not answer must not look like the version was deleted.
					if (!(err instanceof HttpErrorResponse) || err.status !== 404) {
						this.notifications.show('Could not reach the server, so this version could not be opened. Please try again in a moment.', 10_000);
					}
					this.router.navigate(['/']);
					return EMPTY;
				}),
			);
		}

		this.versionManager.setActiveVersion(slug);
		return of(null);
	}

}
