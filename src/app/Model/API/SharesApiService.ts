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

	public createShare(request: ShareCreateRequest): Observable<ShareCreateResponse>
	{
		return this.http.post<ShareCreateResponse>(`${env.apiUrl}/v1/shares`, request);
	}

	public getShare(uuid: string): Observable<SharePayload>
	{
		return this.http.get<SharePayload>(`${env.apiUrl}/v1/shares/${uuid}`);
	}

	public getVisited(): Observable<VisitedSharesResponse>
	{
		return this.http.get<VisitedSharesResponse>(`${env.apiUrl}/v1/shares/visited`);
	}

	public recordVisit(uuid: string): Observable<void>
	{
		return this.http.put<void>(`${env.apiUrl}/v1/shares/visited/${uuid}`, null);
	}

	public removeVisit(uuid: string): Observable<void>
	{
		return this.http.delete<void>(`${env.apiUrl}/v1/shares/visited/${uuid}`);
	}

}
