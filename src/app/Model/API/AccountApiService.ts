import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {AccountProfile} from '@src/Model/API/Schema/Account/AccountProfile';

/** /v1/account - the signed-in user's profile. Not under /v1/auth, so the interceptor handles the Bearer header. */
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

	/** null (or blank) clears the display name; otherwise 1-50 characters after trimming. */
	public updateDisplayName(displayName: string | null): Observable<AccountProfile>
	{
		return this.http.put<AccountProfile>(this.base, {displayName});
	}

}
