import {Injectable, Optional, Signal, computed, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {EMPTY, Observable, throwError, timer} from 'rxjs';
import {catchError, concatMap, filter, finalize, map, switchMap, take, timeout} from 'rxjs/operators';
import {OAuthApiService} from '@src/Model/API/OAuthApiService';
import {OAuthCallbackResponse} from '@src/Model/API/Schema/Auth/OAuthCallbackResponse';
import {OAuthStartResponse} from '@src/Model/API/Schema/Auth/OAuthStartResponse';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';

const POLL_INTERVAL = 2_000;
/** The API keeps a flow's state for ten minutes. */
const FLOW_TIMEOUT = 10 * 60_000;

/**
 * The provider can only redirect to the website callback page, so the system browser runs the flow and the app polls the API until it completes.
 * The browser has to confirm the code the app shows (or hand the callback back to the app), so a flow someone else started cannot be finished by a victim's click.
 */
@Injectable({providedIn: 'root'})
export class DesktopOAuthFlow
{

	private readonly pendingSignal = signal<{provider: string, start: OAuthStartResponse} | null>(null);
	public readonly confirmCode: Signal<string | null> = computed(() => this.pendingSignal()?.start.confirmCode ?? null);

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
				this.pendingSignal.set({provider, start});
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
			finalize(() => this.pendingSignal.set(null)),
		);
	}

	/** An sftools://auth/callback link from the website's callback page; false when it belongs to no sign-in this app started. */
	public completeFromLink(provider: string, params: Record<string, string>): boolean
	{
		const pending = this.pendingSignal();
		if (pending === null || pending.provider !== provider || params['state'] !== pending.start.state) {
			return false;
		}
		// The poll picks up the result; a failure here shows up there as well.
		this.oauthApi.callback(provider, params, false, false, pending.start.confirmCode ?? '').subscribe({error: () => undefined});
		return true;
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
