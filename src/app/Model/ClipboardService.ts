import {Injectable} from '@angular/core';

@Injectable({providedIn: 'root'})
export class ClipboardService
{

	public copy(text: string): Promise<void>
	{
		return navigator.clipboard.writeText(text);
	}

	/** WebKit (Safari and the macOS desktop app) refuses a write that starts after the click is over, so the write starts inside the click with the text still on its way. */
	public copyPending(text: Promise<string>): Promise<void>
	{
		if (typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function') {
			try {
				const item = new ClipboardItem({'text/plain': text.then(value => new Blob([value], {type: 'text/plain'}))});
				return navigator.clipboard.write([item]).catch(() => text.then(value => this.copy(value)));
			} catch {
				// Older engines take only finished blobs; the plain write below still works where the click is not required.
			}
		}
		return text.then(value => this.copy(value));
	}

}
