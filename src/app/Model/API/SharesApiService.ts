import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {ShareCreateRequest} from '@src/Model/API/Schema/Shares/ShareCreateRequest';
import {ShareCreateResponse} from '@src/Model/API/Schema/Shares/ShareCreateResponse';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';

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

}
