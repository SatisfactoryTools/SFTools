import {Injector, Injectable} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {filter, Observable, take} from 'rxjs';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/**
 * Blocks the initial render until the user's settings have loaded, so number
 * formatting, graph colours and the remembered panel layout are all in place
 * before the planner (or anything else) draws - no flash of defaults.
 */
@Injectable({providedIn: 'root'})
export class SettingsResolver
{

	public constructor(
		private readonly settings: SettingsManager,
		private readonly injector: Injector,
	)
	{
	}

	public resolve(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<unknown>
	{
		return toObservable(this.settings.loaded, {injector: this.injector}).pipe(
			filter(loaded => loaded),
			take(1),
		);
	}

}
