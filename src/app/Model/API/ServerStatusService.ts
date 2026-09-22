import {Injectable, Signal, WritableSignal, computed, signal} from '@angular/core';

/**
 * Tracks API requests that are waiting to be retried, so the app can tell the
 * user the server is temporarily unreachable instead of looking frozen. Fed by
 * RetryInterceptor; read by the banner in ContentComponent.
 */
@Injectable({providedIn: 'root'})
export class ServerStatusService
{

	private readonly pendingRetriesSignal: WritableSignal<number> = signal(0);

	/** True while at least one API request is sitting in its backoff wait. */
	public readonly retrying: Signal<boolean> = computed(() => this.pendingRetriesSignal() > 0);

	public retryStarted(): void
	{
		this.pendingRetriesSignal.update(pending => pending + 1);
	}

	public retryFinished(): void
	{
		this.pendingRetriesSignal.update(pending => Math.max(0, pending - 1));
	}

}
