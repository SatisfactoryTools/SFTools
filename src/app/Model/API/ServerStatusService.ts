import {Injectable, Signal, WritableSignal, computed, signal} from '@angular/core';

@Injectable({providedIn: 'root'})
export class ServerStatusService
{

	private readonly pendingRetriesSignal: WritableSignal<number> = signal(0);

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
