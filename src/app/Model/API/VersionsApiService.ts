import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';
import {env} from '@env/env';
import {CreateVersionRequest} from '@src/Model/API/Schema/CreateVersionRequest';
import {LinkVersionsResponse} from '@src/Model/API/Schema/LinkVersionsResponse';
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

	/**
	 * Creates a custom version - open to anonymous users too. Identical
	 * definitions deduplicate server-side (200 + the existing version instead
	 * of 201); both statuses resolve the same way here. Logged-in callers get
	 * the version linked to their account automatically; anonymous callers
	 * must record the id in LocalCustomVersionsService.
	 */
	public createVersion(request: CreateVersionRequest): Observable<Version>
	{
		return this.http.post<Version>(`${env.apiUrl}/v1/versions`, request);
	}

	/** Fetches a single version by id - public, works for any version whose UUID is known. */
	public getVersion(id: string): Observable<Version>
	{
		return this.http.get<Version>(`${env.apiUrl}/v1/versions/${id}`);
	}

	/**
	 * Ensures the version's data file exists on disk (it is a prunable cache
	 * artifact) and resolves to its current location. Idempotent and cheap
	 * when the file is already there.
	 */
	public ensureVersionData(id: string): Observable<VersionDataLocation>
	{
		return this.http.post<VersionDataLocation>(`${env.apiUrl}/v1/versions/${id}/data`, null);
	}

	/** Links custom versions to the signed-in account - bulk and idempotent (adopts localStorage versions after login). */
	public linkVersions(ids: string[]): Observable<LinkVersionsResponse>
	{
		return this.http.post<LinkVersionsResponse>(`${env.apiUrl}/v1/versions/link`, {versions: ids});
	}

	/** Removes the account's link to a custom version. The version itself keeps existing - plans and other users' links are unaffected. */
	public unlinkVersion(id: string): Observable<void>
	{
		return this.http.delete<void>(`${env.apiUrl}/v1/versions/${id}/link`);
	}

	/** Previews resource-node counts for the given world settings - open to anonymous users; cached server-side per seed/mode/purity. */
	public worldDataPreview(request: WorldDataRequest): Observable<WorldDataPreview>
	{
		return this.http.post<WorldDataPreview>(`${env.apiUrl}/v1/versions/world-data`, request);
	}

	/**
	 * Fetches a version's data file (outside the active-version resource),
	 * re-materializing it once if the cached file was pruned. The retry uses
	 * the dataPath returned by the ensure call - it may differ from the
	 * version's known one.
	 */
	public loadVersionFile(version: Version): Observable<VersionFile>
	{
		return this.fetchVersionFile(version.dataPath).pipe(
			catchError(() => this.ensureVersionData(version.id).pipe(
				switchMap(location => this.fetchVersionFile(location.dataPath)),
			)),
		);
	}

	/**
	 * The raw static data file fetch. The URL is immutable-cacheable, so no
	 * cache-busting parameters - they would bypass the browser cache.
	 */
	private fetchVersionFile(dataPath: string): Observable<VersionFile>
	{
		return this.http.get<VersionFile>(`${env.apiUrl}/${dataPath}`);
	}

}
