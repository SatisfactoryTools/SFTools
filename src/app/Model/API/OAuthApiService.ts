import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {OAuthCallbackResponse} from '@src/Model/API/Schema/Auth/OAuthCallbackResponse';
import {OAuthConnectionsResponse} from '@src/Model/API/Schema/Auth/OAuthConnectionsResponse';
import {OAuthProvidersResponse} from '@src/Model/API/Schema/Auth/OAuthProvidersResponse';
import {OAuthStartResponse} from '@src/Model/API/Schema/Auth/OAuthStartResponse';
import {AuthenticatedRequest} from '@src/Model/Auth/AuthenticatedRequest';

/**
 * Third-party sign-in endpoints. The AuthInterceptor skips /v1/auth/ URLs by
 * default, so the calls that need the signed-in user (link flow, connections,
 * disconnect) are marked with AuthenticatedRequest - the interceptor then
 * attaches the Bearer header and refreshes an expired access token for them
 * exactly as for the rest of the API.
 */
@Injectable({providedIn: 'root'})
export class OAuthApiService
{

	private readonly base = `${env.apiUrl}/v1/auth/oauth`;

	public constructor(private readonly http: HttpClient)
	{
	}

	public getProviders(): Observable<OAuthProvidersResponse>
	{
		return this.http.get<OAuthProvidersResponse>(`${this.base}/providers`);
	}

	/**
	 * Starts a flow; redirect the browser to the returned authorizationUrl.
	 * Without the Bearer header this is a login/signup; with it (`link`) the
	 * provider is attached to the signed-in account instead - so the request
	 * is only marked as authenticated when linking.
	 */
	public start(provider: string, link: boolean): Observable<OAuthStartResponse>
	{
		return this.http.post<OAuthStartResponse>(`${this.base}/${provider}/start`, null, {
			context: link ? AuthenticatedRequest.context() : undefined,
		});
	}

	/** Completes a flow with every query parameter the provider sent to the callback page. */
	public callback(provider: string, params: Record<string, string>): Observable<OAuthCallbackResponse>
	{
		return this.http.post<OAuthCallbackResponse>(`${this.base}/${provider}/callback`, {params});
	}

	public getConnections(): Observable<OAuthConnectionsResponse>
	{
		return this.http.get<OAuthConnectionsResponse>(`${this.base}/connections`, {context: AuthenticatedRequest.context()});
	}

	public disconnect(provider: string): Observable<{message: string}>
	{
		return this.http.delete<{message: string}>(`${this.base}/${provider}`, {context: AuthenticatedRequest.context()});
	}

}
