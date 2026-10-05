import {Injectable, Signal, signal} from '@angular/core';
import {OldToolsImportRequest} from '@src/Model/OldTools/OldToolsImportRequest';

/**
 * Hands an import request from the URL (the planner reads ?importOld=…) to
 * the plans panel, which owns the import dialog. The panel may not exist yet
 * when the planner opens - it is created when its panel renders - so the
 * request waits here until the panel picks it up.
 */
@Injectable({providedIn: 'root'})
export class OldToolsImportRequestService
{

	private readonly pendingSignal = signal<OldToolsImportRequest | null>(null);
	public readonly pending: Signal<OldToolsImportRequest | null> = this.pendingSignal.asReadonly();

	public request(request: OldToolsImportRequest): void
	{
		this.pendingSignal.set(request);
	}

	/** The waiting request, cleared - the dialog it opens must not reopen on the next panel render. */
	public consume(): OldToolsImportRequest | null
	{
		const request = this.pendingSignal();
		this.pendingSignal.set(null);
		return request;
	}

}
