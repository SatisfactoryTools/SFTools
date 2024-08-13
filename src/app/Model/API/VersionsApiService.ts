import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {CreateVersionRequest} from '@src/Model/API/Schema/CreateVersionRequest';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionFile} from '@src/Model/API/Schema/VersionFile';
import {WorldDataPreview} from '@src/Model/API/Schema/World/WorldDataPreview';
import {WorldDataRequest} from '@src/Model/API/Schema/World/WorldDataRequest';

@Injectable({providedIn: 'root'})
export class VersionsApiService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	/** Creates a custom version (requires authentication); resolves to the created version object. */
	public createVersion(request: CreateVersionRequest): Observable<Version>
	{
		return this.http.post<Version>(`${env.apiUrl}/v1/versions`, request);
	}

	/** Fetches a single version by id - public, so shares from other users' versions can resolve their game data. */
	public getVersion(id: string): Observable<Version>
	{
		return this.http.get<Version>(`${env.apiUrl}/v1/versions/${id}`);
	}

	/** Previews resource-node counts for the given world settings (requires authentication). */
	public worldDataPreview(request: WorldDataRequest): Observable<WorldDataPreview>
	{
		return this.http.post<WorldDataPreview>(`${env.apiUrl}/v1/versions/world-data`, request);
	}

	/** Fetches a version's data file directly (outside the active-version resource). */
	public fetchVersionFile(dataPath: string): Observable<VersionFile>
	{
		return this.http.get<VersionFile>(`${env.apiUrl}/${dataPath}`);
	}

}
