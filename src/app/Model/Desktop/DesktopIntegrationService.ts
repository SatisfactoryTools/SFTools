import {Injectable, Injector, NgZone, Optional, effect} from '@angular/core';
import {Router} from '@angular/router';
import {AppLinks} from '@src/Model/Desktop/AppLinks';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {DesktopPreferencesService} from '@src/Model/Desktop/DesktopPreferencesService';
import {DesktopUpdateService} from '@src/Model/Desktop/DesktopUpdateService';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';

@Injectable({providedIn: 'root'})
export class DesktopIntegrationService
{

	private started = false;

	public constructor(
		@Optional() private readonly desktop: DesktopBridge | null,
		private readonly preferences: DesktopPreferencesService,
		private readonly updates: DesktopUpdateService,
		private readonly connectivity: ConnectivityService,
		private readonly router: Router,
		private readonly zone: NgZone,
		private readonly injector: Injector,
	)
	{
	}

	public start(): void
	{
		if (this.desktop === null || this.started) {
			return;
		}
		this.started = true;
		const desktop = this.desktop;

		document.documentElement.classList.add('desktop-app');

		document.addEventListener('click', event => this.onClick(event, desktop), true);

		void desktop.listen<string>('deep-link', url => this.zone.run(() => this.open(url)))
			.then(() => desktop.invoke<string[]>('deep_link_ready'))
			.then(urls => this.zone.run(() => urls.forEach(url => this.open(url))));

		// Re-registered on every start: an AppImage moves with every update.
		effect(() => {
			const enabled = this.preferences.preferences().openLinks;
			desktop.invoke('deep_link_set_enabled', {enabled})
				.catch(error => console.error('Could not change the sftools:// link registration:', error));
		}, {injector: this.injector});

		if (this.preferences.preferences().checkForUpdates && this.connectivity.online()) {
			this.updates.check();
		}
	}

	public open(link: string): boolean
	{
		const path = AppLinks.pathOf(link);
		if (path === null) {
			return false;
		}
		// A bare sftools:// only brings the app to the front.
		if (path !== '/') {
			void this.router.navigateByUrl(path);
		}
		return true;
	}

	/** Links to other sites open in the system browser: the window only ever shows the app. */
	private onClick(event: MouseEvent, desktop: DesktopBridge): void
	{
		const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
		if (anchor === null || event.defaultPrevented) {
			return;
		}
		const url = new URL(anchor.href, window.location.href);
		if (url.origin === window.location.origin) {
			return;
		}
		event.preventDefault();
		if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
			desktop.openExternal(url.href);
		}
	}

}
