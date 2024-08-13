import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {VersionsListResponse} from '@src/AppModule/Model/API/Schema/VersionsListResponse';

@Injectable({providedIn: 'root'})
export class ApiService
{

	public constructor(private http: HttpClient)
	{
	}

	public getVersions(): Observable<VersionsListResponse>
	{
		return this.http.get<VersionsListResponse>('/assets/versions.json'); // TODO error handling ?
	}

}
