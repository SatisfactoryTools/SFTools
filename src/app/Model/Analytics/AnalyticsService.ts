import {Injectable} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {env} from '@env/env';

/** Matomo's command queue; the tracker script drains it once loaded. */
type MatomoQueue = unknown[][];

/**
 * Page-view and event tracking through the self-hosted Matomo the old tools
 * already report to. The migration to the new tools is measured with it
 * (arrivals from the old site, imports of old plans), so both sites must feed
 * the same instance. Nothing is loaded, and every call is a no-op, until a
 * site id is configured - local builds stay silent.
 *
 * Respects the browser's Do Not Track, like the old site does.
 */
@Injectable({providedIn: 'root'})
export class AnalyticsService
{

	private readonly enabled: boolean;

	public constructor(router: Router)
	{
		this.enabled = env.matomo.siteId !== null;
		if (!this.enabled) {
			return;
		}
		this.load(env.matomo.url, env.matomo.siteId!);

		// A single-page app never reloads, so page views are the router's
		// navigations. The first one also carries a ?from= marker when the
		// user arrived through one of the old site's links.
		let first = true;
		router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(event => {
			const url = new URL(event.urlAfterRedirects, window.location.origin);
			this.queue().push(['setCustomUrl', url.href]);
			this.queue().push(['setDocumentTitle', document.title]);
			this.queue().push(['trackPageView']);
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
		if (!this.enabled) {
			return;
		}
		this.queue().push(['trackEvent', category, action, name, value]);
	}

	private queue(): MatomoQueue
	{
		const holder = window as unknown as {_paq?: MatomoQueue};
		holder._paq ??= [];
		return holder._paq;
	}

	private load(url: string, siteId: number): void
	{
		const queue = this.queue();
		queue.push(['setDoNotTrack', true]);
		queue.push(['enableLinkTracking']);
		queue.push(['setTrackerUrl', `${url}matomo.php`]);
		queue.push(['setSiteId', String(siteId)]);
		const script = document.createElement('script');
		script.async = true;
		script.src = `${url}matomo.js`;
		document.head.appendChild(script);
	}

}
