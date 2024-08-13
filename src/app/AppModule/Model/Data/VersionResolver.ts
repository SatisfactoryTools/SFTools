import {ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot} from '@angular/router';
import {Version} from '@src/AppModule/Model/Data/Version';
import {Injectable} from '@angular/core';
import {Observable, of, EMPTY} from 'rxjs';
import {switchMap, catchError} from 'rxjs/operators';
import {ApiService} from '@src/AppModule/Model/API/ApiService';
import {VersionsListResponse} from '@src/AppModule/Model/API/Schema/VersionsListResponse';

@Injectable({providedIn: 'root'})
export class VersionResolver implements Resolve<Version[]>
{

	public constructor(private api: ApiService, private router: Router)
	{
	}


	public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Version[]>
	{
		return this.api.getVersions().pipe(
			catchError(() => {
				console.log('empty result');
				return EMPTY;
			}),
			switchMap((data: VersionsListResponse) => {
				const result = [];
				for (const key in data) {
					result.push(new Version(data[key]));
				}
				console.log('set result');
				return of(result);
			}),
		);
	}

}
