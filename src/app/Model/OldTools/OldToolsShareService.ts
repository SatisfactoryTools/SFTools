import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {env} from '@env/env';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';
import {OldToolsShareResponse} from '@src/Model/OldTools/OldToolsShareResponse';

/** The old site's own share API - retired together with the old site. */
const OLD_SHARE_API_URL = 'https://api.satisfactorytools.com/v2/share';

/**
 * Loads production lines shared through the old Satisfactory Tools
 * (satisfactorytools.com/...?share=KEY links). The shares were copied into
 * this app's API (GET /v1/legacy-shares/{key}) so the links outlive the old
 * site; a key the copy does not know yet is still asked of the old API while
 * that exists. Both are public and CORS-open.
 */
@Injectable({providedIn: 'root'})
export class OldToolsShareService
{

	public constructor(private readonly http: HttpClient)
	{
	}

	/**
	 * The share key of a pasted link, or the input itself when it already is
	 * a bare key; null when neither applies.
	 */
	public extractShareKey(text: string): string | null
	{
		const fromLink = text.match(/[?&]share=([A-Za-z0-9]+)/);
		if (fromLink) {
			return fromLink[1];
		}
		const bareKey = text.trim().match(/^[A-Za-z0-9]{8,}$/);
		return bareKey ? bareKey[0] : null;
	}

	/** Keys from a comma-separated list, as the old site's "take my plans" link carries them. */
	public parseShareKeyList(text: string | null): string[]
	{
		if (text === null) {
			return [];
		}
		return [...new Set(text.split(',').map(part => this.extractShareKey(part)).filter((key): key is string => key !== null))];
	}

	public fetchShare(shareKey: string): Observable<OldProductionData>
	{
		const key = encodeURIComponent(shareKey);
		return this.http.get<OldProductionData>(`${env.apiUrl}/v1/legacy-shares/${key}`).pipe(
			// The trailing slash avoids a redirect on the old API.
			catchError(() => this.http.get<OldToolsShareResponse>(`${OLD_SHARE_API_URL}/${key}/`).pipe(map(response => response?.data))),
			map(data => {
				if (!data?.request) {
					throw new Error('The share does not contain a production line.');
				}
				return data;
			}),
		);
	}

}
