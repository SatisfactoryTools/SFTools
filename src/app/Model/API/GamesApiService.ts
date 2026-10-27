import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {GamesSchema} from '@src/Model/API/Schema/Games/GamesSchema';

@Injectable({providedIn: 'root'})
export class GamesApiService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	public get(): Observable<GamesSchema>
	{
		return this.http.get<GamesSchema>(this.base());
	}

	public save(data: string, revision: number): Observable<GamesSchema>
	{
		return this.http.put<GamesSchema>(this.base(), {data, revision});
	}

	private base(): string
	{
		return `${env.apiUrl}/v1/games`;
	}

}
