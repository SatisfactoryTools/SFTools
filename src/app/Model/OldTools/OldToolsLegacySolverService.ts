import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {env} from '@env/env';
import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';
import {OldProductionRequest} from '@src/Model/OldTools/OldProductionRequest';

const API_VERSIONS: Record<OldGameVersion, string> = {
	'0.8': '0.8.0',
	'1.0': '1.0.0',
	'1.0-ficsmas': '1.0.0-ficsmas',
};

@Injectable({providedIn: 'root'})
export class OldToolsLegacySolverService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	public solve(request: OldProductionRequest, gameVersion: OldGameVersion): Observable<Record<string, number>>
	{
		return this.http.post<{result?: Record<string, number>}>(`${env.apiUrl}/v1/legacy-solver`, {
			gameVersion: API_VERSIONS[gameVersion],
			request,
		}).pipe(map(response => response?.result ?? {}));
	}

}
