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

/**
 * "Script error." is all a browser reveals about an error in another origin's script; the ResizeObserver one is harmless.
 * Firefox throws "Permission denied to access property" when a zone.js timer calls back into an extension's sandbox.
 */
const BENIGN_MESSAGES = ['Script error', 'ResizeObserver loop', 'Permission denied to access property'];

/** The retry banner and the offline indicator already cover these. */
const UNREACHABLE_STATUSES = [0, 502, 503, 504];

const STACK_URL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s)'"]+/gi;

const EXTENSION_URL = /^(chrome|moz|safari-web|ms-browser)-extension:\/\//;

/** Safari runs userscripts (and some extensions' injected code) as "user-script:N" frames, which have no URL. */
const USER_SCRIPT_FRAME = /(^|[\s@(])user-script:\d/m;

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
		// Our code only ever rejects with Error instances (desktop commands with strings). A bare undefined/null or a plain object
		// ({} from in-app browsers on iOS, extension messaging replies like {requestId: "contentScriptVisibilityChanged …"}) has no stack and is someone else's.
		if (error === undefined || error === null || this.isPlainObject(error) || this.isForeignError(error)) {
			return 'ignore';
		}
		if (sourceUrl !== null && !this.isOwnUrl(sourceUrl)) {
			return 'ignore';
		}
		if (error instanceof Error && (this.injectedScriptSyntaxError(error) || this.thrownByOthers(error))) {
			return 'ignore';
		}
		return 'report';
	}

	private isPlainObject(error: unknown): boolean
	{
		if (typeof error !== 'object' || error === null) {
			return false;
		}
		// Not `=== Object.prototype`: objects from an extension's content-script world carry that realm's Object.prototype.
		const prototype: unknown = Object.getPrototypeOf(error);
		return prototype === null || Object.getPrototypeOf(prototype) === null;
	}

	/** An Error from another realm (an extension's world or a frame) fails instanceof Error; ours never does. */
	private isForeignError(error: unknown): boolean
	{
		return typeof error === 'object' && error !== null && !(error instanceof Error) && Object.prototype.toString.call(error) === '[object Error]';
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

	/**
	 * A syntax error without a single stack frame is a script that failed to parse. Ours is one bundle that already runs and never evaluates code,
	 * so it is a script injected by the in-app browser or an extension (an unsupported token, or a redeclaration when it runs twice).
	 */
	private injectedScriptSyntaxError(error: Error): boolean
	{
		return error.name === 'SyntaxError' && (error.stack ?? '').replace(error.message, '').match(STACK_URL) === null;
	}

	/**
	 * Browser extensions inject scripts into the page; an error whose every stack frame is in someone else's code is not ours.
	 * One thrown by an extension is not ours either, even when zone.js frames below it are: its timers run through the patched globals.
	 */
	private thrownByOthers(error: Error): boolean
	{
		const stack = (error.stack ?? '').replace(error.message, '');
		if (USER_SCRIPT_FRAME.test(stack)) {
			return true;
		}
		const frames = stack.match(STACK_URL);
		return frames !== null && (EXTENSION_URL.test(frames[0]) || frames.every(url => !this.isOwnScript(url)));
	}

	// Injected inline scripts (Brave's wallet, for one) report the page itself as their source, so only our bundle files count as ours.
	private isOwnScript(frameUrl: string): boolean
	{
		const url = frameUrl.replace(/(:\d+){1,2}$/, '');
		if (!this.isOwnUrl(url)) {
			return false;
		}
		try {
			return /\.m?js$/.test(new URL(url, window.location.href).pathname);
		} catch {
			return true;
		}
	}

}
