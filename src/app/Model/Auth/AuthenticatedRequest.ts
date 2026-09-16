import {HttpContext, HttpContextToken, HttpRequest} from '@angular/common/http';

/**
 * Opt-in marker for API calls under /v1/auth/ that still act on behalf of the
 * signed-in user (OAuth connections, disconnect, the link-flow start). The
 * AuthInterceptor skips /v1/auth/ by default because most of it is the
 * sign-in machinery itself - login, refresh, callbacks - where a Bearer header
 * must not be attached and a 401 means "wrong credentials", not "expired
 * token". A request carrying this context is treated like any other
 * authenticated API call: Bearer header, proactive refresh of an expired
 * access token and a refresh-then-retry on 401.
 */
export class AuthenticatedRequest
{

	private static readonly TOKEN = new HttpContextToken<boolean>(() => false);

	public static context(): HttpContext
	{
		return new HttpContext().set(AuthenticatedRequest.TOKEN, true);
	}

	public static isMarked(request: HttpRequest<unknown>): boolean
	{
		return request.context.get(AuthenticatedRequest.TOKEN);
	}

}
