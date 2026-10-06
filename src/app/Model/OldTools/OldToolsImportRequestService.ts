import {Injectable, Signal, signal} from '@angular/core';
import {OldToolsImportRequest} from '@src/Model/OldTools/OldToolsImportRequest';

@Injectable({providedIn: 'root'})
export class OldToolsImportRequestService
{

	private readonly pendingSignal = signal<OldToolsImportRequest | null>(null);
	public readonly pending: Signal<OldToolsImportRequest | null> = this.pendingSignal.asReadonly();

	public request(request: OldToolsImportRequest): void
	{
		this.pendingSignal.set(request);
	}

	/** Cleared on read: the dialog it opens must not reopen on the next panel render. */
	public consume(): OldToolsImportRequest | null
	{
		const request = this.pendingSignal();
		this.pendingSignal.set(null);
		return request;
	}

}
