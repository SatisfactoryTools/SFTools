import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {SettingsSchema} from '@src/Model/API/Schema/Settings/SettingsSchema';

@Injectable({providedIn: 'root'})
export class SettingsApiService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	public get(): Observable<SettingsSchema>
	{
		return this.http.get<SettingsSchema>(this.base());
	}

	public save(data: string, revision: number): Observable<SettingsSchema>
	{
		return this.http.put<SettingsSchema>(this.base(), {data, revision});
	}

	private base(): string
	{
		return `${env.apiUrl}/v1/settings`;
	}

}
