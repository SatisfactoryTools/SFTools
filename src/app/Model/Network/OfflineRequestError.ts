import {HttpErrorResponse, HttpRequest} from '@angular/common/http';

/** The error a request gets while offline - shaped like a connection that never completed (status 0). */
export class OfflineRequestError
{

	public static for(req: HttpRequest<unknown>): HttpErrorResponse
	{
		return new HttpErrorResponse({status: 0, statusText: 'Offline', url: req.urlWithParams, error: {error: 'You are offline.'}});
	}

}
