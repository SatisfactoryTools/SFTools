import {HttpRequest} from '@angular/common/http';

export class OfflineCacheKey
{

	/** API answers can differ by account (custom versions in the version list), so signed-in use is kept apart; static data files are the same for everyone. */
	public static of(responseType: string, url: string, signedIn: boolean): string
	{
		const scope = url.includes('/v1/') ? (signedIn ? ' account' : ' anonymous') : '';
		return `${responseType} ${url}${scope}`;
	}

	public static ofRequest(req: HttpRequest<unknown>, signedIn: boolean): string
	{
		return OfflineCacheKey.of(req.responseType, req.urlWithParams, signedIn);
	}

}
