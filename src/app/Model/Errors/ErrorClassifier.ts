import {Injectable} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {env} from '@env/env';
import {ErrorKind} from '@src/Model/Errors/ErrorKind';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';

/** A failed fetch() carries a different message in each browser. Connection trouble has its own offline indicator. */
const NETWORK_MESSAGES = [
	'Failed to fetch',
	'NetworkError when attempting to fetch resource',
	'Load failed',
	'The network connection was lost',
	'The Internet connection appears to be offline',
];

/** A lazy chunk that is gone after a deploy (or unreachable offline). */
const CHUNK_MESSAGES = [
	'Failed to fetch dynamically imported module',
	'error loading dynamically imported module',
	'Importing a module script failed',
];

/** "Script error." is all a browser reveals about an error in another origin's script; the ResizeObserver one is harmless. */
const BENIGN_MESSAGES = ['Script error', 'ResizeObserver loop'];

/** The retry banner and the offline indicator already cover these. */
const UNREACHABLE_STATUSES = [0, 502, 503, 504];

const STACK_URL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s)'"]+/gi;

@Injectable({providedIn: 'root'})
export class ErrorClassifier
{

	public constructor(private readonly connectivity: ConnectivityService)
	{
	}

	public classify(error: unknown, sourceUrl: string | null): ErrorKind
	{
		if (error instanceof HttpErrorResponse) {
			return UNREACHABLE_STATUSES.includes(error.status) || !this.isOwnUrl(error.url) ? 'ignore' : 'report';
		}
		if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
			return 'ignore';
		}
		const message = error instanceof Error ? error.message : String(error);
		// Before the network messages: Chromium's chunk failure also starts with "Failed to fetch".
		if (CHUNK_MESSAGES.some(known => message.includes(known))) {
			return navigator.onLine && this.connectivity.online() ? 'update' : 'ignore';
		}
		if ([...NETWORK_MESSAGES, ...BENIGN_MESSAGES].some(known => message.includes(known))) {
			return 'ignore';
		}
		if (sourceUrl !== null && !this.isOwnUrl(sourceUrl)) {
			return 'ignore';
		}
		if (error instanceof Error && this.thrownByOthers(error)) {
			return 'ignore';
		}
		return 'report';
	}

	private isOwnUrl(url: string | null): boolean
	{
		if (url === null) {
			return true;
		}
		try {
			return new URL(url, window.location.href).origin === window.location.origin || url.startsWith(env.apiUrl);
		} catch {
			return true;
		}
	}

	/** Browser extensions inject scripts into the page; an error whose every stack frame is in someone else's code is not ours. */
	private thrownByOthers(error: Error): boolean
	{
		const frames = (error.stack ?? '').replace(error.message, '').match(STACK_URL);
		return frames !== null && frames.every(url => !this.isOwnUrl(url));
	}

}
