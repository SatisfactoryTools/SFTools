import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {OAuthCallbackResponse} from '@src/Model/API/Schema/Auth/OAuthCallbackResponse';
import {OAuthConnectionsResponse} from '@src/Model/API/Schema/Auth/OAuthConnectionsResponse';
import {OAuthProvidersResponse} from '@src/Model/API/Schema/Auth/OAuthProvidersResponse';
import {OAuthStartResponse} from '@src/Model/API/Schema/Auth/OAuthStartResponse';
import {AuthService} from '@src/Model/Auth/AuthService';

/**
 * Third-party sign-in endpoints. The AuthInterceptor deliberately skips
 * /v1/auth/ URLs, so the calls that need the signed-in user (link flow,
 * connections, disconnect) attach the Bearer header themselves.
 */
@Injectable({providedIn: 'root'})
export class OAuthApiService
{

	private readonly base = `${env.apiUrl}/v1/auth/oauth`;

	public constructor(
		private readonly http: HttpClient,
		private readonly authService: AuthService,
	)
	{
	}

	public getProviders(): Observable<OAuthProvidersResponse>
	{
		return this.http.get<OAuthProvidersResponse>(`${this.base}/providers`);
	}

	/**
	 * Starts a flow; redirect the browser to the returned authorizationUrl.
	 * Without the Bearer header this is a login/signup; with it (`link`) the
	 * provider is attached to the signed-in account instead.
	 */
	public start(provider: string, link: boolean): Observable<OAuthStartResponse>
	{
		return this.http.post<OAuthStartResponse>(`${this.base}/${provider}/start`, null, {
			headers: link ? this.authHeaders() : {},
		});
	}

	/** Completes a flow with every query parameter the provider sent to the callback page. */
	public callback(provider: string, params: Record<string, string>): Observable<OAuthCallbackResponse>
	{
		return this.http.post<OAuthCallbackResponse>(`${this.base}/${provider}/callback`, {params});
	}

	public getConnections(): Observable<OAuthConnectionsResponse>
	{
		return this.http.get<OAuthConnectionsResponse>(`${this.base}/connections`, {headers: this.authHeaders()});
	}

	public disconnect(provider: string): Observable<{message: string}>
	{
		return this.http.delete<{message: string}>(`${this.base}/${provider}`, {headers: this.authHeaders()});
	}

	private authHeaders(): Record<string, string>
	{
		const token = this.authService.accessToken();
		return token ? {Authorization: `Bearer ${token}`} : {};
	}

}
