import {Injectable} from '@angular/core';
import {HttpBackend, HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {BehaviorSubject, Observable, of, throwError} from 'rxjs';
import {catchError, filter, switchMap, take} from 'rxjs/operators';
import {env} from '@env/env';
import {TokenResponse} from '@src/Model/API/Schema/Auth/TokenResponse';
import {AuthService} from '@src/Model/Auth/AuthService';
import {NotificationService} from '@src/Model/NotificationService';

@Injectable()
export class AuthInterceptor implements HttpInterceptor
{

	private isRefreshing = false;
	private readonly refreshSubject = new BehaviorSubject<string | null>(null);
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
				this.authService.clearSession();
				this.notificationService.show('Session expired. Please log in again.');
				return throwError(() => err);
			}),
		);
	}

	private doRefresh(): Observable<string>
	{
		if (this.isRefreshing) {
			return this.refreshSubject.pipe(
				filter((token): token is string => token !== null),
				take(1),
			);
		}

		this.isRefreshing = true;
		this.refreshSubject.next(null);

		const refreshToken = this.authService.getRefreshToken();
		if (!refreshToken) {
			this.isRefreshing = false;
			return throwError(() => new Error('No refresh token available'));
		}

		return this.bypassHttp.post<TokenResponse>(`${env.apiUrl}/v1/auth/refresh`, {refreshToken}).pipe(
			switchMap(response => {
				this.isRefreshing = false;
				this.authService.storeSession(this.authService.currentLogin() ?? '', response);
				this.refreshSubject.next(response.accessToken);
				return of(response.accessToken);
			}),
			catchError(err => {
				this.isRefreshing = false;
				this.refreshSubject.next(null);
				return throwError(() => err);
			}),
		);
	}

}
