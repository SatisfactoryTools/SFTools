import {Injectable} from '@angular/core';
import {OAuthPendingFlow} from '@src/Model/Auth/OAuthPendingFlow';

const STORAGE_KEY = 'sftools.auth.oauthFlow';

/**
 * Remembers the browser sign-in this tab started, so the callback page only completes that one: a callback
 * URL someone sent would otherwise sign the visitor into the sender's account (or link the visitor's provider to it).
 */
@Injectable({providedIn: 'root'})
export class OAuthFlowStore
{

	// With site data blocked sessionStorage throws a SecurityError; the callback then refuses the flow.
	public remember(flow: OAuthPendingFlow): void
	{
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
		} catch {
			// Nothing to remember it in.
		}
	}

	public take(state: string, provider: string): OAuthPendingFlow | null
	{
		let flow: OAuthPendingFlow | null = null;
		try {
			const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as OAuthPendingFlow | null;
			sessionStorage.removeItem(STORAGE_KEY);
			flow = stored;
		} catch {
			return null;
		}
		return flow !== null && state !== '' && flow.state === state && flow.provider === provider ? flow : null;
	}

}
