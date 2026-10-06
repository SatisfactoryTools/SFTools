import {Injectable} from '@angular/core';
import {HttpBackend, HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, finalize, map, share, switchMap} from 'rxjs/operators';
import {env} from '@env/env';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';
import {AuthService} from '@src/Model/Auth/AuthService';
import {AuthenticatedRequest} from '@src/Model/Auth/AuthenticatedRequest';
import {NotificationService} from '@src/Model/NotificationService';

@Injectable()
export class AuthInterceptor implements HttpInterceptor
{

	/**
	 * Shared observable rather than a token subject: when the refresh is rejected every waiting
	 * request errors instead of hanging forever (a hung boot request leaves the page blank).
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
		if (!req.url.startsWith(env.apiUrl)) {
			return next.handle(req);
		}

		// Auth endpoints get no Bearer: a 401 there is a credentials problem, not an expired token.
		// The few acting on the signed-in user opt back in via AuthenticatedRequest.
		if (req.url.includes('/v1/auth/') && !AuthenticatedRequest.isMarked(req)) {
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
					// Only an explicit rejection ends the session; a network hiccup or a 5xx must not log the user out.
					const rescued = this.authService.clearSession();
					this.notificationService.show(rescued === 0
						? 'You were signed out. Please sign in again.'
						: `You were signed out. ${rescued} plan${rescued === 1 ? '' : 's'} changed offline had not been saved to your account yet - they are kept on this computer.`, 10_000);
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
