import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, tap} from 'rxjs/operators';
import {env} from '@env/env';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';

@Injectable()
export class ConnectivityInterceptor implements HttpInterceptor
{

	public constructor(private readonly connectivity: ConnectivityService)
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
					this.connectivity.reportReachable();
				}
			}),
			catchError((err: unknown) => {
				if (err instanceof HttpErrorResponse) {
					if (err.status === 0) {
						this.connectivity.reportUnreachable();
					} else {
						this.connectivity.reportReachable();
					}
				}
				return throwError(() => err);
			}),
		);
	}

}
