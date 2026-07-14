import {Injector, Injectable} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {filter, Observable, take} from 'rxjs';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Injectable({providedIn: 'root'})
export class VersionsResolver
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly injector: Injector,
	)
	{
	}

	public resolve(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<unknown>
	{
		// ready also covers the anonymous localStorage versions - without them
		// a deep link into one would 404 against findByUrlSlug.
		return toObservable(this.versionManager.ready, {injector: this.injector}).pipe(
			filter(ready => ready),
			take(1),
		);
	}

}
