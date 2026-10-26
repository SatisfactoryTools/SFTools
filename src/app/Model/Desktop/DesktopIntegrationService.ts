import {Injectable, Injector, NgZone, Optional, effect} from '@angular/core';
import {Router} from '@angular/router';
import {DesktopOAuthFlow} from '@src/Model/Auth/DesktopOAuthFlow';
import {AppLinks} from '@src/Model/Desktop/AppLinks';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {DesktopPreferencesService} from '@src/Model/Desktop/DesktopPreferencesService';
import {DesktopUpdateService} from '@src/Model/Desktop/DesktopUpdateService';
import {PlanFileContent} from '@src/Model/PlanFiles/PlanFileContent';
import {PlanFileOpenService} from '@src/Model/PlanFiles/PlanFileOpenService';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {NotificationService} from '@src/Model/NotificationService';

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
		private readonly planFiles: PlanFileOpenService,
		private readonly desktopOAuth: DesktopOAuthFlow,
		private readonly notifications: NotificationService,
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

		void desktop.listen<PlanFileContent>('open-file', file => this.zone.run(() => void this.planFiles.open(file)))
			.then(() => desktop.invoke<PlanFileContent[]>('opened_files_ready'))
			.then(files => this.zone.run(() => files.forEach(file => void this.planFiles.open(file))));

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
		if (this.completeSignIn(path)) {
			return true;
		}
		// A bare sftools:// only brings the app to the front.
		if (path !== '/') {
			void this.router.navigateByUrl(path);
		}
		return true;
	}

	/** The website's callback page hands a desktop sign-in back here; one this app did not start is never completed or opened. */
	private completeSignIn(path: string): boolean
	{
		const url = new URL(path, window.location.origin);
		const match = /^\/auth\/callback\/([^/]+)$/.exec(url.pathname);
		if (match === null) {
			return false;
		}
		const params: Record<string, string> = {};
		url.searchParams.forEach((value, key) => params[key] = value);
		if (!this.desktopOAuth.completeFromLink(decodeURIComponent(match[1]), params)) {
			this.notifications.show('That sign-in link was not started in this app, so it was ignored.', 10_000);
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
