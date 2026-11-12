import {Injectable, Signal, computed, signal} from '@angular/core';
import {ConfirmRequest} from '@src/Components/Common/ConfirmRequest';
import {PendingConfirm} from '@src/Components/Common/PendingConfirm';

/** Replaces window.confirm(): the macOS desktop app's web view has no confirm box at all, so confirm() there answered "no" without asking. */
@Injectable({providedIn: 'root'})
export class ConfirmDialogService
{

	private readonly pendingSignal = signal<PendingConfirm | null>(null);
	public readonly request: Signal<ConfirmRequest | null> = computed(() => this.pendingSignal()?.request ?? null);

	public ask(request: ConfirmRequest): Promise<boolean>
	{
		// A new question replaces one still open; the old one counts as cancelled.
		this.pendingSignal()?.resolve(false);
		return new Promise<boolean>(resolve => this.pendingSignal.set({request, resolve}));
	}

	public answer(confirmed: boolean): void
	{
		const pending = this.pendingSignal();
		if (pending === null) {
			return;
		}
		this.pendingSignal.set(null);
		pending.resolve(confirmed);
	}

}
