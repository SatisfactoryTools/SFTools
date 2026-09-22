import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable, throwError, timer} from 'rxjs';
import {catchError, finalize, switchMap} from 'rxjs/operators';
import {env} from '@env/env';
import {ServerStatusService} from '@src/Model/API/ServerStatusService';

/**
 * Waits before each retry, in milliseconds. The total (just over half a
 * minute) is set by how long a deployment takes to swap the API over - the
 * point is to ride out the gap without the user noticing anything but a
 * slower-than-usual request.
 */
const RETRY_DELAYS = [2000, 5000, 10000, 15000];

/**
 * Statuses the gateway produces while the application behind it is down. They
 * mean the request never reached the application, so replaying it cannot
 * duplicate anything - even a POST is safe.
 */
const GATEWAY_STATUSES = [502, 503, 504];

/** Methods that change nothing, so they stay safe to replay even when we cannot tell whether the request arrived. */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Retries API requests that failed because the server was momentarily
 * unreachable - the window while a deployment swaps the API over, when the
 * gateway answers 503. Every API call goes through HttpClient, so this covers
 * the boot resolvers, the version data files and the background syncs alike.
 *
 * Registered before AuthInterceptor, which puts it on the outside: each retry
 * passes through the auth layer again and so carries a freshly refreshed
 * token rather than the one that was current when the first attempt failed.
 */
@Injectable()
export class RetryInterceptor implements HttpInterceptor
{

	public constructor(private readonly serverStatus: ServerStatusService)
	{
	}

	public intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>>
	{
		if (!req.url.startsWith(env.apiUrl)) {
			return next.handle(req);
		}
		return this.attempt(req, next, 0);
	}

	private attempt(req: HttpRequest<unknown>, next: HttpHandler, attempt: number): Observable<HttpEvent<unknown>>
	{
		return next.handle(req).pipe(
			catchError((err: unknown) => {
				if (attempt >= RETRY_DELAYS.length || !this.isRetryable(req, err)) {
					return throwError(() => err);
				}
				this.serverStatus.retryStarted();
				return timer(RETRY_DELAYS[attempt]).pipe(
					switchMap(() => this.attempt(req, next, attempt + 1)),
					finalize(() => this.serverStatus.retryFinished()),
				);
			}),
		);
	}

	private isRetryable(req: HttpRequest<unknown>, err: unknown): boolean
	{
		if (!(err instanceof HttpErrorResponse)) {
			return false;
		}
		if (GATEWAY_STATUSES.includes(err.status)) {
			return true;
		}
		// Status 0 is a connection that never completed. The request may or may
		// not have been processed, so only the methods that change nothing are
		// safe to send again.
		return err.status === 0 && SAFE_METHODS.includes(req.method.toUpperCase());
	}

}
