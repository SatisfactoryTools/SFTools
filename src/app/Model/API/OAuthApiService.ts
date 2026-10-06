import {Injectable} from '@angular/core';
import {HttpClient, HttpResponse} from '@angular/common/http';
import {Observable} from 'rxjs';
import {env} from '@env/env';
import {OAuthCallbackResponse} from '@src/Model/API/Schema/Auth/OAuthCallbackResponse';
import {OAuthConnectionsResponse} from '@src/Model/API/Schema/Auth/OAuthConnectionsResponse';
import {OAuthProvidersResponse} from '@src/Model/API/Schema/Auth/OAuthProvidersResponse';
import {OAuthStartResponse} from '@src/Model/API/Schema/Auth/OAuthStartResponse';
import {AuthenticatedRequest} from '@src/Model/Auth/AuthenticatedRequest';

/** The AuthInterceptor skips /v1/auth URLs, so the calls that need the signed-in user are marked with AuthenticatedRequest. */
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

	/** Only linking needs the signed-in user; without the Bearer header the same call is a login/signup. */
	public start(provider: string, link: boolean, desktop = false): Observable<OAuthStartResponse>
	{
		return this.http.post<OAuthStartResponse>(`${this.base}/${provider}/start`, desktop ? {desktop: true} : null, {
			context: link ? AuthenticatedRequest.context() : undefined,
		});
	}

	public callback(provider: string, params: Record<string, string>): Observable<OAuthCallbackResponse>
	{
		return this.http.post<OAuthCallbackResponse>(`${this.base}/${provider}/callback`, {params});
	}

	/** Observed as a response: 202 means the browser has not come back yet. */
	public pollDesktop(state: string, pollToken: string): Observable<HttpResponse<OAuthCallbackResponse>>
	{
		return this.http.post<OAuthCallbackResponse>(`${this.base}/desktop/poll`, {state, pollToken}, {observe: 'response'});
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
