import {Injectable, Injector, NgZone, Optional} from '@angular/core';
import {HttpBackend, HttpClient} from '@angular/common/http';
import {env} from '@env/env';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/** A page stuck in an error loop must not flood the endpoint; the server groups repeats anyway. */
const REPORTS_PER_PAGE_LOAD = 10;

/** Sends caught errors to the API, which stores them and posts new ones to Discord. */
@Injectable({providedIn: 'root'})
export class ErrorReporter
{

	/** Bypasses the interceptors: a failing report must not retry, refresh tokens or end up in the API call log. */
	private readonly http: HttpClient;

	private readonly sent = new Set<string>();

	public constructor(
		backend: HttpBackend,
		private readonly zone: NgZone,
		private readonly injector: Injector,
		private readonly connectivity: ConnectivityService,
		@Optional() private readonly desktop: DesktopBridge | null,
	)
	{
		this.http = new HttpClient(backend);
	}

	/**
	 * Resolves true once the API took it, and never rejects or throws: a failure must not reach the error handler, which
	 * would report it again. Settles outside the Angular zone, so it never triggers change detection.
	 */
	public report(message: string, details: string, build: string): Promise<boolean>
	{
		if (!env.production || !this.enabled() || !this.connectivity.online() || this.sent.has(message) || this.sent.size >= REPORTS_PER_PAGE_LOAD) {
			return Promise.resolve(false);
		}
		this.sent.add(message);
		const app = this.desktop === null ? 'website' : `desktop ${this.desktop.info.version} (${this.desktop.info.platform})`;
		return new Promise(resolve => this.zone.runOutsideAngular(() => {
			try {
				this.http.post(`${env.apiUrl}/v1/errors`, {message, details, app, build}).subscribe({
					next: () => resolve(true),
					error: (failure: unknown) => {
						console.warn('Could not report the error:', failure);
						resolve(false);
					},
				});
			} catch (failure) {
				console.warn('Could not report the error:', failure);
				resolve(false);
			}
		}));
	}

	/** Looked up per report: the handler is created at startup, before settings may be safe to build. */
	private enabled(): boolean
	{
		try {
			return this.injector.get(SettingsManager).account().errorReports;
		} catch {
			return true;
		}
	}

}
