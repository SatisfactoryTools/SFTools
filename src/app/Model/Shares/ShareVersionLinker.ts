import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {VersionManager} from '@src/Model/Data/VersionManager';

/** Without this link a custom version someone else made is unknown to the viewer and its planner URL cannot resolve. */
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
					// A failed link is tolerated: the version still works this session and the next visit retries.
					catchError(() => of(null)),
					map(() => version),
				);
			}),
			tap(version => this.versionManager.registerCreatedVersion(version)),
			map(() => void 0),
		);
	}

}
