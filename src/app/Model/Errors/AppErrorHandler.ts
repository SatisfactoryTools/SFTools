import {ErrorHandler, Injectable, Optional} from '@angular/core';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {ErrorClassifier} from '@src/Model/Errors/ErrorClassifier';
import {ErrorPopup} from '@src/Model/Errors/ErrorPopup';

@Injectable()
export class AppErrorHandler extends ErrorHandler
{

	/** One error can arrive twice: through the Angular zone and through the window listeners. */
	private readonly seen = new WeakSet<object>();

	public constructor(
		private readonly classifier: ErrorClassifier,
		private readonly popup: ErrorPopup,
		@Optional() private readonly desktop: DesktopBridge | null,
	)
	{
		super();
	}

	public override handleError(error: unknown): void
	{
		super.handleError(error);
		try {
			const original = this.unwrap(error);
			if (typeof original === 'object' && original !== null) {
				if (this.seen.has(original)) {
					return;
				}
				this.seen.add(original);
			}
			// An ErrorEvent without an error object (another origin's script) arrives wrapped, with the event as its cause.
			const sourceUrl = original instanceof Error && original.cause instanceof ErrorEvent ? original.cause.filename || null : null;
			const kind = this.classifier.classify(original, sourceUrl);
			if (kind === 'ignore') {
				return;
			}
			const summary = this.summary(original);
			this.popup.show({kind, signature: kind === 'update' ? 'update' : summary.slice(0, 300), details: this.details(original, summary)});
		} catch (failure) {
			console.error('Could not show the error:', failure);
		}
	}

	private unwrap(error: unknown): unknown
	{
		let current = error;
		while (typeof current === 'object' && current !== null && 'rejection' in current && current.rejection !== undefined && current.rejection !== current) {
			current = current.rejection;
		}
		return current;
	}

	private summary(error: unknown): string
	{
		if (error instanceof Error) {
			return `${error.name}: ${error.message}`;
		}
		if (typeof error === 'object' && error !== null) {
			try {
				return JSON.stringify(error);
			} catch {
				return String(error);
			}
		}
		return String(error);
	}

	private details(error: unknown, summary: string): string
	{
		const script = document.querySelector<HTMLScriptElement>('script[src*="main"]');
		const app = this.desktop === null ? 'website' : `desktop ${this.desktop.info.version} (${this.desktop.info.platform})`;
		return [
			`Message: ${summary}`,
			`Page: ${window.location.href}`,
			`Time: ${new Date().toISOString()}`,
			`App: ${app}`,
			`Build: ${script?.src.split('/').pop() ?? 'unknown'}`,
			`Browser: ${navigator.userAgent}`,
			...(error instanceof Error && error.stack ? ['Stack:', error.stack] : []),
		].join('\n');
	}

}
