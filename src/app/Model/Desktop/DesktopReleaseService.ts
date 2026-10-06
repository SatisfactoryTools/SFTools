import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {DesktopReleaseManifest} from '@src/Model/Desktop/DesktopReleaseManifest';

@Injectable({providedIn: 'root'})
export class DesktopReleaseService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	public latest(): Observable<DesktopReleaseManifest>
	{
		return this.http.get<DesktopReleaseManifest>(`${env.apiUrl}/desktop/latest.json`);
	}

}
