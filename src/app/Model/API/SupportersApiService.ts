import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {SupporterListResponse} from '@src/Model/API/Schema/Supporters/SupporterListResponse';

@Injectable({providedIn: 'root'})
export class SupportersApiService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	public getList(): Observable<SupporterListResponse>
	{
		return this.http.get<SupporterListResponse>(`${env.apiUrl}/v1/supporters`);
	}

}
