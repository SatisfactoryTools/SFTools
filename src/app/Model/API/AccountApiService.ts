import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {AccountProfile} from '@src/Model/API/Schema/Account/AccountProfile';

@Injectable({providedIn: 'root'})
export class AccountApiService
{

	private readonly base = `${env.apiUrl}/v1/account`;

	public constructor(private readonly http: HttpClient)
	{
	}

	public getProfile(): Observable<AccountProfile>
	{
		return this.http.get<AccountProfile>(this.base);
	}

	public updateDisplayName(displayName: string | null): Observable<AccountProfile>
	{
		return this.http.put<AccountProfile>(this.base, {displayName});
	}

}
