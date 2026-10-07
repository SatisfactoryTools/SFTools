import {Injectable, Optional, effect, untracked} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {env} from '@env/env';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';

type MatomoQueue = {push: (command: unknown[]) => unknown};

@Injectable({providedIn: 'root'})
export class AnalyticsService
{

	private readonly enabled: boolean;
	/** The website's URLs even in the desktop app, so a page counts the same wherever it was opened. */
	private readonly pageOrigin: string;
	/** The webview's user agent alone does not tell the desktop app from a browser. */
	private readonly platform: 'web' | 'desktop';
	private loaded = false;

	public constructor(
		router: Router,
		private readonly connectivity: ConnectivityService,
		@Optional() desktop: DesktopBridge | null,
	)
	{
		this.enabled = env.matomo.siteId !== null;
		this.pageOrigin = desktop === null ? window.location.origin : env.webUrl;
		this.platform = desktop === null ? 'web' : 'desktop';
		if (!this.enabled) {
			return;
		}
		this.configure(env.matomo.url, env.matomo.siteId!, env.matomo.platformDimensionId);

		// The host is not reachable offline, so the script is fetched on the first online moment (and again if that failed).
		effect(() => {
			if (this.connectivity.online() && !this.loaded) {
				untracked(() => this.load(env.matomo.url));
			}
		});

		let first = true;
		router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => {
			const url = new URL(event.urlAfterRedirects, this.pageOrigin);
			if (this.connectivity.online()) {
				this.push(['setCustomUrl', url.href]);
				this.push(['setDocumentTitle', document.title]);
				this.push(['trackPageView']);
			}
			if (first) {
				first = false;
				const from = url.searchParams.get('from');
				if (from !== null) {
					this.trackEvent('Arrival', from);
				}
			}
		});
	}

	public trackEvent(category: string, action: string, name?: string, value?: number): void
	{
		if (!this.enabled || !this.connectivity.online()) {
			return;
		}
		this.push(['trackEvent', category, action, name, value]);
	}

	/** Blockers replace or stub out _paq (and the tracker itself can throw), and analytics must never break the app. */
	private push(command: unknown[]): void
	{
		try {
			const holder = window as unknown as {_paq?: unknown};
			holder._paq ??= [];
			const queue = holder._paq as Partial<MatomoQueue> | null;
			if (typeof queue?.push === 'function') {
				queue.push(command);
			}
		} catch {
			// ignored on purpose
		}
	}

	/** Matomo applies commands queued before the script exists once it runs. */
	private configure(url: string, siteId: number, platformDimensionId: number | null): void
	{
		this.push(['disableCookies']);
		this.push(['setDoNotTrack', true]);
		this.push(['enableLinkTracking']);
		this.push(['setTrackerUrl', `${url}matomo.php`]);
		this.push(['setSiteId', String(siteId)]);
		// Set once on the tracker, it rides along with every page view and event after it.
		if (platformDimensionId !== null) {
			this.push(['setCustomDimension', platformDimensionId, this.platform]);
		}
	}

	private load(url: string): void
	{
		this.loaded = true;
		try {
			const script = document.createElement('script');
			script.async = true;
			script.src = `${url}matomo.js`;
			// A failed or blocked fetch lets the next online moment try again; the queued commands wait meanwhile.
			script.addEventListener('error', () => {
				script.remove();
				this.loaded = false;
			});
			document.head.appendChild(script);
		} catch {
			this.loaded = false;
		}
	}

}
