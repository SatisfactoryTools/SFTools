import {Injectable, Optional} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {EMPTY, Observable, throwError, timer} from 'rxjs';
import {catchError, concatMap, filter, map, switchMap, take, timeout} from 'rxjs/operators';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {OAuthCallbackResponse} from '@src/Model/API/Schema/Auth/OAuthCallbackResponse';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';

const POLL_INTERVAL = 2_000;
/** The API keeps a flow's state for ten minutes. */
const FLOW_TIMEOUT = 10 * 60_000;

/** The provider can only redirect to the website callback page, so the system browser runs the flow and the app polls the API until it completes. */
@Injectable({providedIn: 'root'})
export class DesktopOAuthFlow
{

	public constructor(
		private readonly oauthApi: OAuthApiService,
		@Optional() private readonly desktop: DesktopBridge | null,
	)
	{
	}

	public get available(): boolean
	{
		return this.desktop !== null;
	}

	public run(provider: string, link: boolean): Observable<OAuthCallbackResponse>
	{
		return this.oauthApi.start(provider, link, true).pipe(
			switchMap(start => {
				this.desktop!.openExternal(start.authorizationUrl);
				return timer(POLL_INTERVAL, POLL_INTERVAL).pipe(
					concatMap(() => this.oauthApi.pollDesktop(start.state, start.pollToken!).pipe(
						// A dropped request is just a skipped poll.
						catchError((err: unknown) => err instanceof HttpErrorResponse && err.status === 0 ? EMPTY : throwError(() => err)),
					)),
					filter(response => response.status === 200),
					take(1),
					map(response => response.body!),
					timeout(FLOW_TIMEOUT),
				);
			}),
			catchError((err: unknown) => throwError(() => new Error(this.messageOf(err)))),
		);
	}

	private messageOf(err: unknown): string
	{
		if (err instanceof HttpErrorResponse) {
			const message = (err.error as {error?: string} | null)?.error;
			if (err.status === 400 && message) {
				return message;
			}
			if (err.status === 404) {
				return 'The sign-in expired. Please try again.';
			}
		}
		if (err instanceof Error && err.name === 'TimeoutError') {
			return 'The sign-in was not finished in time. Please try again.';
		}
		return 'Signing in did not work. Please try again.';
	}

}
