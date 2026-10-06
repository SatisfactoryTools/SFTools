import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {env} from '@env/env';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';

@Injectable({providedIn: 'root'})
export class OldToolsShareService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	public extractShareKey(text: string): string | null
	{
		const fromLink = text.match(/[?&]share=([A-Za-z0-9]+)/);
		if (fromLink) {
			return fromLink[1];
		}
		const bareKey = text.trim().match(/^[A-Za-z0-9]{8,}$/);
		return bareKey ? bareKey[0] : null;
	}

	public parseShareKeyList(text: string | null): string[]
	{
		if (text === null) {
			return [];
		}
		return [...new Set(text.split(',').map(part => this.extractShareKey(part)).filter((key): key is string => key !== null))];
	}

	public fetchShare(shareKey: string): Observable<OldProductionData>
	{
		return this.http.get<OldProductionData>(`${env.apiUrl}/v1/legacy-shares/${encodeURIComponent(shareKey)}`).pipe(
			map(data => {
				if (!data?.request) {
					throw new Error('The share does not contain a production line.');
				}
				return data;
			}),
		);
	}

}
