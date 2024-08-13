import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {EMPTY, Observable, of} from 'rxjs';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Injectable({providedIn: 'root'})
export class VersionDataResolver
{

	public constructor(
		private readonly versionManager: VersionManager,
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
			this.router.navigate(['/']);
			return EMPTY;
		}

		this.versionManager.setActiveVersion(slug);
		return of(null);
	}

}
