import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {env} from '@env/env';
import {CreateVersionRequest} from '@src/Model/API/Schema/CreateVersionRequest';
import {LinkVersionsResponse} from '@src/Model/API/Schema/LinkVersionsResponse';
import {PlanCountsResponse} from '@src/Model/API/Schema/Plans/PlanCountsResponse';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionDataLocation} from '@src/Model/API/Schema/VersionDataLocation';
import {VersionFile} from '@src/Model/API/Schema/VersionFile';
import {WorldDataPreview} from '@src/Model/API/Schema/World/WorldDataPreview';
import {WorldDataRequest} from '@src/Model/API/Schema/World/WorldDataRequest';

@Injectable({providedIn: 'root'})
export class VersionsApiService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	public createVersion(request: CreateVersionRequest): Observable<Version>
	{
		return this.http.post<Version>(`${env.apiUrl}/v1/versions`, request);
	}

	public planCounts(): Observable<PlanCountsResponse>
	{
		return this.http.get<PlanCountsResponse>(`${env.apiUrl}/v1/versions/plan-counts`);
	}

	public getVersion(id: string): Observable<Version>
	{
		return this.http.get<unknown>(`${env.apiUrl}/v1/versions/${id}`).pipe(map(body => this.parseVersion(body)));
	}

	public ensureVersionData(id: string): Observable<VersionDataLocation>
	{
		return this.http.post<VersionDataLocation>(`${env.apiUrl}/v1/versions/${id}/data`, null);
	}

	public linkVersions(ids: string[]): Observable<LinkVersionsResponse>
	{
		return this.http.post<LinkVersionsResponse>(`${env.apiUrl}/v1/versions/link`, {versions: ids});
	}

	public unlinkVersion(id: string): Observable<void>
	{
		return this.http.delete<void>(`${env.apiUrl}/v1/versions/${id}/link`);
	}

	public worldDataPreview(request: WorldDataRequest): Observable<WorldDataPreview>
	{
		return this.http.post<WorldDataPreview>(`${env.apiUrl}/v1/versions/world-data`, request);
	}

	/** A pruned cache file is re-materialized once; the ensure call may return a different dataPath. */
	public loadVersionFile(version: Version): Observable<VersionFile>
	{
		return this.fetchVersionFile(version.dataPath).pipe(
			catchError(() => this.ensureVersionData(version.id).pipe(
				switchMap(location => this.fetchVersionFile(location.dataPath)),
			)),
		);
	}

	// A mangled body (seen from browser extensions or proxies) would otherwise be stored as a version whose URL slug is 'undefined'.
	private parseVersion(body: unknown): Version
	{
		const version = body as Partial<Version> | null;
		if (typeof version !== 'object' || version === null || Array.isArray(version) || typeof version.id !== 'string' || typeof version.dataPath !== 'string') {
			throw new Error('The version response is not a version.');
		}
		return version as Version;
	}

	/** The URL is immutable-cacheable, so no cache-busting parameters - they would bypass the browser cache. */
	private fetchVersionFile(dataPath: string): Observable<VersionFile>
	{
		return this.http.get<VersionFile>(`${env.apiUrl}/${dataPath}`);
	}

}
