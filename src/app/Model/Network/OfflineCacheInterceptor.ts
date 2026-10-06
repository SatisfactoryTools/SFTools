import {Injectable, Optional} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Observable, from, throwError} from 'rxjs';
import {catchError, switchMap, tap} from 'rxjs/operators';
import {env} from '@env/env';
import {AuthService} from '@src/Model/Auth/AuthService';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {OfflineCacheKey} from '@src/Model/Network/OfflineCacheKey';
import {OfflineRequestError} from '@src/Model/Network/OfflineRequestError';

// Account data the offline mirrors keep instead, or things that make no sense offline.
const NOT_CACHED = [
	/\/v1\/(auth|plans|settings|account|help\/editor)(\/|$|\?)/,
	/\/v1\/versions\/[^/]+\/(plans|folders)(\/|$|\?)/,
	/\/v1\/versions\/plan-counts/,
	/\/v1\/shares\/visited/,
];

/**
 * Must sit outermost, before RetryInterceptor: offline, non-cacheable requests fail at once instead of
 * riding out the retry backoff meant for deploys. A no-op in a browser.
 */
@Injectable()
export class OfflineCacheInterceptor implements HttpInterceptor
{

	public constructor(
		private readonly connectivity: ConnectivityService,
		private readonly auth: AuthService,
		@Optional() private readonly desktop: DesktopBridge | null,
	)
	{
	}

	public intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>>
	{
		if (this.desktop === null || !req.url.startsWith(env.apiUrl)) {
			return next.handle(req);
		}
		const cacheable = this.isCacheable(req);
		if (!this.connectivity.online()) {
			return cacheable ? this.fromCache(req) : throwError(() => OfflineRequestError.for(req));
		}
		if (!cacheable) {
			return next.handle(req);
		}
		return next.handle(req).pipe(
			tap(event => {
				if (event instanceof HttpResponse && event.status === 200) {
					this.store(req, event);
				}
			}),
			catchError((err: unknown) => err instanceof HttpErrorResponse && err.status === 0
				? this.fromCache(req, err)
				: throwError(() => err)),
		);
	}

	private isCacheable(req: HttpRequest<unknown>): boolean
	{
		return req.method === 'GET'
			&& (req.responseType === 'json' || req.responseType === 'text')
			&& !NOT_CACHED.some(pattern => pattern.test(req.url));
	}

	private keyOf(req: HttpRequest<unknown>): string
	{
		return OfflineCacheKey.ofRequest(req, this.auth.isAuthenticated());
	}

	private store(req: HttpRequest<unknown>, response: HttpResponse<unknown>): void
	{
		const body = req.responseType === 'text' ? String(response.body) : JSON.stringify(response.body);
		this.desktop!.invoke('cache_put', {key: this.keyOf(req), body})
			.catch(error => console.error('Could not cache a response:', error));
	}

	private fromCache(req: HttpRequest<unknown>, failure: HttpErrorResponse = OfflineRequestError.for(req)): Observable<HttpEvent<unknown>>
	{
		return from(this.desktop!.invoke<string | null>('cache_get', {key: this.keyOf(req)})).pipe(
			switchMap(body => {
				if (body === null) {
					return throwError(() => failure);
				}
				return [new HttpResponse({
					body: req.responseType === 'text' ? body : JSON.parse(body) as unknown,
					status: 200,
					statusText: 'OK (offline copy)',
					url: req.urlWithParams,
				})];
			}),
		);
	}

}
