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
		return toObservable(this.versionManager.versionsResource.isLoading, {injector: this.injector}).pipe(
			filter(loading => !loading),
			take(1),
		);
	}

}
