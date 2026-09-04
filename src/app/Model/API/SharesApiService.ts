import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {ShareCreateRequest} from '@src/Model/API/Schema/Shares/ShareCreateRequest';
import {ShareCreateResponse} from '@src/Model/API/Schema/Shares/ShareCreateResponse';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {VisitedSharesResponse} from '@src/Model/API/Schema/Shares/VisitedSharesResponse';

@Injectable({providedIn: 'root'})
export class SharesApiService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	/** Freezes a folder/plan subtree into a share (requires authentication). */
	public createShare(request: ShareCreateRequest): Observable<ShareCreateResponse>
	{
		return this.http.post<ShareCreateResponse>(`${env.apiUrl}/v1/shares`, request);
	}

	/** Loads a frozen share - public, no auth needed. */
	public getShare(uuid: string): Observable<SharePayload>
	{
		return this.http.get<SharePayload>(`${env.apiUrl}/v1/shares/${uuid}`);
	}

	/** The account's visited-shares list, most recently visited first (requires authentication). */
	public getVisited(): Observable<VisitedSharesResponse>
	{
		return this.http.get<VisitedSharesResponse>(`${env.apiUrl}/v1/shares/visited`);
	}

	/** Records (or refreshes) a visit; the server stamps visitedAt and evicts beyond the cap. */
	public recordVisit(uuid: string): Observable<void>
	{
		return this.http.put<void>(`${env.apiUrl}/v1/shares/visited/${uuid}`, null);
	}

	/** Removes the visit entry - never the share itself. Idempotent. */
	public removeVisit(uuid: string): Observable<void>
	{
		return this.http.delete<void>(`${env.apiUrl}/v1/shares/visited/${uuid}`);
	}

}
