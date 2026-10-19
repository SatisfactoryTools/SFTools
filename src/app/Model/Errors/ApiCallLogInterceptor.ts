import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, tap} from 'rxjs/operators';
import {env} from '@env/env';
import {ApiCallLog} from '@src/Model/Errors/ApiCallLog';

/** Innermost, so every retry and token refresh shows up as the separate call it is. */
@Injectable()
export class ApiCallLogInterceptor implements HttpInterceptor
{

	public constructor(private readonly log: ApiCallLog)
	{
	}

	public intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>>
	{
		if (!req.url.startsWith(env.apiUrl)) {
			return next.handle(req);
		}
		return next.handle(req).pipe(
			tap(event => {
				if (event instanceof HttpResponse) {
					this.log.recordResponse(req, event);
				}
			}),
			catchError((err: unknown) => {
				if (err instanceof HttpErrorResponse) {
					this.log.recordFailure(req, err);
				}
				return throwError(() => err);
			}),
		);
	}

}
