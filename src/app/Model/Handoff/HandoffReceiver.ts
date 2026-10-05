const DONE_KEY = 'sftools.handoff.done';
const REQUEST = 'sftools.handoff.request';
const REPLY = 'sftools.handoff.data';
const PLAN_STORE_PREFIX = 'sftools.plans.';

/** How long the beta origin gets to answer before the app boots without it. */
const TIMEOUT_MS = 4000;

/** The shape of a localStorage plan store, as far as merging needs it. */
interface PlanStoreLike
{
	folders?: Array<{id: string}>;
	plans?: Array<{id: string}>;
}

/**
 * Brings a beta user's browser data over from the origin the app was
 * beta-tested on (new.satisfactorytools.com) after the move to the final
 * domain. localStorage is per origin, so local plans, settings and the
 * sign-in session would otherwise be left behind there.
 *
 * Runs before the app bootstraps - the services read localStorage in their
 * constructors - and only once per browser: the beta origin's /handoff.html
 * is loaded in a hidden iframe, asked for its entries, and whatever this
 * origin does not have yet is copied in. Plan stores that exist on both
 * sides are merged by id. Nothing here throws: a missing or slow iframe just
 * lets the app boot as it is, and the attempt is not repeated.
 */
export class HandoffReceiver
{

	public constructor(private readonly sourceOrigin: string | null)
	{
	}

	public run(): Promise<void>
	{
		if (this.sourceOrigin === null || this.sourceOrigin === window.location.origin || window.parent !== window) {
			return Promise.resolve();
		}
		try {
			if (localStorage.getItem(DONE_KEY) !== null) {
				return Promise.resolve();
			}
		} catch {
			return Promise.resolve();
		}
		return this.fetchEntries().then(entries => {
			if (entries !== null) {
				this.merge(entries);
			}
			this.markDone();
		});
	}

	private fetchEntries(): Promise<Record<string, string> | null>
	{
		return new Promise(resolve => {
			const iframe = document.createElement('iframe');
			let settled = false;
			const finish = (entries: Record<string, string> | null): void => {
				if (settled) {
					return;
				}
				settled = true;
				window.removeEventListener('message', onMessage);
				iframe.remove();
				resolve(entries);
			};
			const onMessage = (event: MessageEvent): void => {
				if (event.origin !== this.sourceOrigin || event.source !== iframe.contentWindow) {
					return;
				}
				const data = event.data as {type?: string; entries?: Record<string, string>} | null;
				if (data?.type === REPLY && data.entries && typeof data.entries === 'object') {
					finish(data.entries);
				}
			};
			window.addEventListener('message', onMessage);
			setTimeout(() => finish(null), TIMEOUT_MS);

			iframe.setAttribute('aria-hidden', 'true');
			iframe.style.display = 'none';
			iframe.addEventListener('load', () => iframe.contentWindow?.postMessage({type: REQUEST}, this.sourceOrigin!));
			iframe.addEventListener('error', () => finish(null));
			iframe.src = `${this.sourceOrigin}/handoff.html`;
			document.body.appendChild(iframe);
		});
	}

	private merge(entries: Record<string, string>): void
	{
		for (const [key, value] of Object.entries(entries)) {
			if (typeof value !== 'string' || key.startsWith('sftools.handoff.')) {
				continue;
			}
			try {
				const existing = localStorage.getItem(key);
				if (existing === null) {
					localStorage.setItem(key, value);
				} else if (key.startsWith(PLAN_STORE_PREFIX)) {
					localStorage.setItem(key, this.mergePlanStores(existing, value));
				}
				// Anything else already here was made on this origin after the
				// move and is the fresher of the two - it stays.
			} catch {
				// Quota or blocked storage: skip this key, keep going.
			}
		}
	}

	/** Folders and plans of the incoming store that this one lacks are appended; everything else stays as is. */
	private mergePlanStores(existingRaw: string, incomingRaw: string): string
	{
		try {
			const existing = JSON.parse(existingRaw) as PlanStoreLike;
			const incoming = JSON.parse(incomingRaw) as PlanStoreLike;
			const folderIds = new Set((existing.folders ?? []).map(folder => folder.id));
			const planIds = new Set((existing.plans ?? []).map(plan => plan.id));
			existing.folders = [...existing.folders ?? [], ...(incoming.folders ?? []).filter(folder => !folderIds.has(folder.id))];
			existing.plans = [...existing.plans ?? [], ...(incoming.plans ?? []).filter(plan => !planIds.has(plan.id))];
			return JSON.stringify(existing);
		} catch {
			return existingRaw;
		}
	}

	private markDone(): void
	{
		try {
			localStorage.setItem(DONE_KEY, String(Date.now()));
		} catch {
			// Nothing to remember it in; the next load tries again, which is harmless.
		}
	}

}
