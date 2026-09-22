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
		// The segment is a public version's slug, or the id of a custom version.
		const slug = route.paramMap.get('versionSlug')!;
		const version = this.versionManager.findByUrlSlug(slug);

		if (!version)
		{
			// A version someone else made is not in this user's list yet - the link they
			// were sent is the first they hear of it. Adding it is what the share route
			// does too, so a plan link into a custom version works the same. An unknown
			// slug that the API does not know either still goes home.
			return this.versionLinker.ensure(slug).pipe(
				map(() => {
					this.versionManager.setActiveVersion(slug);
					return null;
				}),
				catchError((err: unknown) => {
					// A slug the API does not know is a dead link and going home
					// is the whole answer. A server that did not answer is not -
					// bouncing someone out of their bookmarked planner with no
					// word of why reads as the version having been deleted.
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
