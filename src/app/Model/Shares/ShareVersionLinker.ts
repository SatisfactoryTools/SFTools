import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {VersionManager} from '@src/Model/Data/VersionManager';

/**
 * Puts the game version of something opened from a link into the viewer's own list.
 * Versions are shared, deduplicated objects, so this is only a link - but without it a
 * custom version someone else made is unknown to the viewer and its planner URL cannot
 * even resolve. Used by every "opened from a link" entry point: shares, plan links and
 * the version route itself.
 */
@Injectable({providedIn: 'root'})
export class ShareVersionLinker
{

	public constructor(
		private readonly versionsApi: VersionsApiService,
		private readonly versionManager: VersionManager,
		private readonly authService: AuthService,
	)
	{
	}

	/**
	 * Makes sure the version is in the viewer's list, fetching it publicly when it is
	 * not. Takes the version's id or its URL slug - a plan link carries only the slug,
	 * and GET /v1/versions/{uuid} accepts both. Authenticated viewers get a server-side
	 * link too; a failed link is tolerated (the version still works this session and
	 * the next visit retries).
	 */
	public ensure(idOrSlug: string): Observable<void>
	{
		if (this.versionManager.versions().some(v => v.id === idOrSlug || this.versionManager.urlSlug(v) === idOrSlug)) {
			return of(void 0);
		}
		return this.versionsApi.getVersion(idOrSlug).pipe(
			switchMap(version => {
				if (!this.authService.isAuthenticated()) {
					return of(version);
				}
				return this.versionsApi.linkVersions([version.id]).pipe(
					catchError(() => of(null)),
					map(() => version),
				);
			}),
			tap(version => this.versionManager.registerCreatedVersion(version)),
			map(() => void 0),
		);
	}

}
