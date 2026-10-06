import {Injectable, Optional} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable, throwError, timer} from 'rxjs';
import {catchError, finalize, switchMap} from 'rxjs/operators';
import {env} from '@env/env';
import {ServerStatusService} from '@src/Model/API/ServerStatusService';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';

/** Totals just over half a minute - how long a deployment takes to swap the API over. */
const RETRY_DELAYS = [2000, 5000, 10000, 15000];

/** The request never reached the application, so replaying it cannot duplicate anything - even a POST is safe. */
const GATEWAY_STATUSES = [502, 503, 504];

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/** Registered before AuthInterceptor, so each retry passes through the auth layer again and carries a freshly refreshed token. */
@Injectable()
export class RetryInterceptor implements HttpInterceptor
{

	public constructor(
		private readonly serverStatus: ServerStatusService,
		private readonly connectivity: ConnectivityService,
		@Optional() private readonly desktop: DesktopBridge | null,
	)
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
		// Status 0 never completed, so only methods that change nothing are replayed. The desktop app stops once the
		// connection is known to be gone (its offline cache answers); a website cannot tell that from a deploy refusing connections.
		return err.status === 0
			&& SAFE_METHODS.includes(req.method.toUpperCase())
			&& (this.desktop === null || this.connectivity.online());
	}

}
