import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';
import {OldToolsShareResponse} from '@src/Model/OldTools/OldToolsShareResponse';

const SHARE_API_URL = 'https://api.satisfactorytools.com/v2/share';

/**
 * Loads production lines shared through the old Satisfactory Tools
 * (satisfactorytools.com/...?share=KEY links). The share API is public and
 * CORS-open, so the key is fetched straight from the browser.
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

	public fetchShare(shareKey: string): Observable<OldProductionData>
	{
		// The trailing slash avoids a redirect on the old API.
		return this.http.get<OldToolsShareResponse>(`${SHARE_API_URL}/${encodeURIComponent(shareKey)}/`).pipe(
			map(response => {
				if (!response?.data?.request) {
					throw new Error('The share does not contain a production line.');
				}
				return response.data;
			}),
		);
	}

}
