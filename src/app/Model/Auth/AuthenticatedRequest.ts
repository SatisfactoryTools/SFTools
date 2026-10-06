import {HttpContext, HttpContextToken, HttpRequest} from '@angular/common/http';

/**
 * Opt-in for /v1/auth/ calls that act on the signed-in user: the AuthInterceptor skips
 * /v1/auth/ by default because a 401 there means wrong credentials, not an expired token.
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
