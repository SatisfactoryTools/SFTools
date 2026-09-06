import {Injectable} from '@angular/core';
import {HttpBackend, HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, finalize, map, share, switchMap} from 'rxjs/operators';
import {env} from '@env/env';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';
import {AuthService} from '@src/Model/Auth/AuthService';
import {NotificationService} from '@src/Model/NotificationService';

@Injectable()
export class AuthInterceptor implements HttpInterceptor
{

	/**
	 * The refresh call currently in flight, shared by every request that needs
	 * it. Sharing the observable (rather than a token subject) matters for the
	 * failure path: when the refresh is rejected, every waiting request errors
	 * too instead of hanging forever - a hung request at boot (settings or the
	 * version list) leaves the root resolvers pending and the page blank.
	 */
	private refreshInFlight: Observable<string> | null = null;
	private readonly bypassHttp: HttpClient;

	public constructor(
		private readonly authService: AuthService,
		private readonly notificationService: NotificationService,
		backend: HttpBackend,
	)
	{
		this.bypassHttp = new HttpClient(backend);
	}

	public intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>>
	{
		if (!req.url.startsWith(env.apiUrl) || req.url.includes('/v1/auth/')) {
			return next.handle(req);
		}

		const token = this.authService.accessToken();
		if (!token) {
			return next.handle(req);
		}

		if (this.authService.isExpired()) {
			return this.refreshThenRetry(req, next);
		}

		return next.handle(this.withToken(req, token)).pipe(
			catchError(err => {
				if (err instanceof HttpErrorResponse && err.status === 401) {
					return this.refreshThenRetry(req, next);
				}
				return throwError(() => err);
			}),
		);
	}

	private withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown>
	{
		return req.clone({setHeaders: {Authorization: `Bearer ${token}`}});
	}

	private refreshThenRetry(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>>
	{
		return this.doRefresh().pipe(
			switchMap(newToken => next.handle(this.withToken(req, newToken))),
			catchError(err => {
				if (this.isSessionRejected(err)) {
					// Only an explicit rejection (invalid/revoked/missing refresh
					// token) ends the session. A network hiccup or a 5xx from the
					// auth server must not log the user out - the token is still
					// good and the next request simply retries the refresh.
					this.authService.clearSession();
					this.notificationService.show('Your session has expired. Please log in again.', 10_000);
				}
				return throwError(() => err);
			}),
		);
	}

	private isSessionRejected(err: unknown): boolean
	{
		if (!(err instanceof HttpErrorResponse)) {
			// Not an HTTP failure - the "no refresh token" case.
			return true;
		}
		return err.status >= 400 && err.status < 500;
	}

	private doRefresh(): Observable<string>
	{
		if (this.refreshInFlight === null) {
			this.refreshInFlight = this.requestRefresh().pipe(
				finalize(() => this.refreshInFlight = null),
				share(),
			);
		}
		return this.refreshInFlight;
	}

	private requestRefresh(): Observable<string>
	{
		const refreshToken = this.authService.getRefreshToken();
		if (!refreshToken) {
			return throwError(() => new Error('No refresh token available'));
		}

		return this.bypassHttp.post<TokenResponse>(`${env.apiUrl}/v1/auth/refresh`, {refreshToken}).pipe(
			map(response => {
				this.authService.storeSession(this.authService.currentLogin() ?? '', response);
				return response.accessToken;
			}),
		);
	}

}
