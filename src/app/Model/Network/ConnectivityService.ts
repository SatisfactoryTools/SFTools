import {Injectable, NgZone, Signal, WritableSignal, signal} from '@angular/core';
import {env} from '@env/env';

const PROBE_INTERVAL = 15_000;
const PROBE_TIMEOUT = 8_000;
/** Cheap, public and uncached - any answer at all means the API is reachable. */
const PROBE_PATH = '/v1/auth/oauth/providers';

/**
 * navigator.onLine only knows about the network adapter, so a failed request (status 0) also counts:
 * it triggers a probe, and only a failed probe switches to offline.
 */
@Injectable({providedIn: 'root'})
export class ConnectivityService
{

	private readonly onlineSignal: WritableSignal<boolean> = signal(navigator.onLine);
	public readonly online: Signal<boolean> = this.onlineSignal.asReadonly();

	private probing = false;
	private probeTimer: ReturnType<typeof setTimeout> | null = null;

	public constructor(private readonly zone: NgZone)
	{
		window.addEventListener('offline', () => this.zone.run(() => this.setOnline(false)));
		window.addEventListener('online', () => this.zone.run(() => this.probe()));
		if (!navigator.onLine) {
			this.scheduleProbe();
		}
	}

	public reportReachable(): void
	{
		this.setOnline(true);
	}

	public reportUnreachable(): void
	{
		if (this.onlineSignal()) {
			this.probe();
		}
	}

	public check(): void
	{
		this.probe();
	}

	private setOnline(online: boolean): void
	{
		if (this.onlineSignal() !== online) {
			this.onlineSignal.set(online);
		}
		if (online) {
			this.clearProbe();
		} else {
			this.scheduleProbe();
		}
	}

	private probe(): void
	{
		if (this.probing) {
			return;
		}
		this.probing = true;
		this.clearProbe();
		fetch(env.apiUrl + PROBE_PATH, {cache: 'no-store', signal: AbortSignal.timeout(PROBE_TIMEOUT)})
			.then(() => true, () => false)
			.then(reachable => this.zone.run(() => {
				this.probing = false;
				this.setOnline(reachable);
			}));
	}

	private scheduleProbe(): void
	{
		this.clearProbe();
		this.zone.runOutsideAngular(() => {
			this.probeTimer = setTimeout(() => this.probe(), PROBE_INTERVAL);
		});
	}

	private clearProbe(): void
	{
		if (this.probeTimer !== null) {
			clearTimeout(this.probeTimer);
			this.probeTimer = null;
		}
	}

}
