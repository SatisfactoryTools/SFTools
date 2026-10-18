import {Injectable, NgZone, Optional} from '@angular/core';
import {CommunityLinks} from '@src/Model/CommunityLinks';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {ErrorReport} from '@src/Model/Errors/ErrorReport';

/**
 * Plain DOM rather than a component: the errors worth showing are often the ones that stop Angular from rendering.
 * Built outside the Angular zone, so its clicks do not run change detection (and re-throw the error) again.
 */
@Injectable({providedIn: 'root'})
export class ErrorPopup
{

	private readonly entries: {report: ErrorReport; count: number}[] = [];
	private readonly closedSignatures = new Set<string>();
	private ignoreAll = false;
	private detailsOpen = false;
	private element: HTMLElement | null = null;

	public constructor(
		private readonly zone: NgZone,
		@Optional() private readonly desktop: DesktopBridge | null,
	)
	{
	}

	public show(report: ErrorReport): void
	{
		if (this.ignoreAll || this.closedSignatures.has(report.signature)) {
			return;
		}
		const entry = this.entries.find(candidate => candidate.report.signature === report.signature);
		// A repeat only counts: re-rendering on every change detection run would also drop a selection made for copying.
		if (entry !== undefined) {
			entry.count++;
			return;
		}
		this.entries.push({report, count: 1});
		this.zone.runOutsideAngular(() => this.render());
	}

	private close(ignoreAll: boolean): void
	{
		this.ignoreAll ||= ignoreAll;
		this.entries.forEach(entry => this.closedSignatures.add(entry.report.signature));
		this.entries.length = 0;
		this.detailsOpen = false;
		this.element?.remove();
		this.element = null;
	}

	private render(): void
	{
		const update = this.entries.every(entry => entry.report.kind === 'update');
		const popup = this.create('div', 'app-error-popup card shadow');
		popup.setAttribute('role', 'alert');

		const header = this.create('div', 'card-header d-flex align-items-center gap-2');
		header.append(this.create('span', 'fw-semibold flex-grow-1', update ? 'A new version is out' : 'Something went wrong'));
		const closeButton = this.button('btn-close', '', () => this.close(false));
		closeButton.setAttribute('aria-label', 'Close');
		header.append(closeButton);

		const body = this.create('div', 'card-body');
		if (update) {
			body.append(this.create('p', 'mb-0', 'Part of the page could not load because the site was updated. Reload the page to get the new version.'));
		} else {
			body.append(this.create('p', 'mb-2', 'Part of the page may have stopped working. Reloading the page usually fixes it.'));
			const help = this.create('p', 'small text-secondary mb-2', 'If it keeps happening, copy the details and send them to us on ');
			help.append(this.link(CommunityLinks.DISCORD.label, CommunityLinks.DISCORD.url), ' or ', this.link(CommunityLinks.GITHUB.label, CommunityLinks.GITHUB.url), '.');
			body.append(help);
			const details = this.create('details', 'small');
			details.open = this.detailsOpen;
			details.addEventListener('toggle', () => this.detailsOpen = details.open);
			const errorCount = this.entries.length === 1 ? '' : ` (${this.entries.length} different errors)`;
			details.append(this.create('summary', '', `Details${errorCount}`), this.create('pre', 'app-error-popup-details selectable mt-2 mb-0', this.detailsText()));
			body.append(details);
		}

		const footer = this.create('div', 'card-footer d-flex flex-wrap align-items-center gap-2');
		footer.append(this.button('btn btn-sm btn-primary', 'Reload page', () => window.location.reload()));
		if (!update) {
			const copyButton = this.button('btn btn-sm btn-outline-light', 'Copy details', () => this.copy(copyButton, popup));
			footer.append(copyButton);
		}
		const ignoreButton = this.button('btn btn-sm btn-link text-secondary ms-auto px-0', 'Don\'t show errors until reload', () => this.close(true));
		ignoreButton.title = 'Errors stay hidden until you reload the page';
		footer.append(ignoreButton);

		popup.append(header, body, footer);
		if (this.element === null) {
			document.body.append(popup);
		} else {
			this.element.replaceWith(popup);
		}
		this.element = popup;
	}

	private detailsText(): string
	{
		return this.entries
			.map(entry => entry.count === 1 ? entry.report.details : `Happened ${entry.count} times\n${entry.report.details}`)
			.join('\n\n----------\n\n');
	}

	private copy(button: HTMLButtonElement, popup: HTMLElement): void
	{
		const text = this.detailsText();
		const copied = () => {
			button.textContent = 'Copied';
			setTimeout(() => button.textContent = 'Copy details', 2000);
		};
		navigator.clipboard.writeText(text).then(copied, () => {
			// No clipboard access (an insecure origin, or a denied permission): open and select the text for a manual copy.
			const details = popup.querySelector('details');
			const pre = popup.querySelector('pre');
			if (details === null || pre === null) {
				return;
			}
			details.open = true;
			this.detailsOpen = true;
			const range = document.createRange();
			range.selectNodeContents(pre);
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(range);
		});
	}

	private link(label: string, url: string): HTMLAnchorElement
	{
		const link = this.create('a', '', label);
		link.href = url;
		link.target = '_blank';
		link.rel = 'noopener';
		if (this.desktop !== null) {
			const desktop = this.desktop;
			link.addEventListener('click', event => {
				event.preventDefault();
				desktop.openExternal(url);
			});
		}
		return link;
	}

	private button(className: string, label: string, action: () => void): HTMLButtonElement
	{
		const button = this.create('button', className, label);
		button.type = 'button';
		button.addEventListener('click', action);
		return button;
	}

	private create<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string | null = null): HTMLElementTagNameMap[K]
	{
		const element = document.createElement(tag);
		if (className !== '') {
			element.className = className;
		}
		if (text !== null) {
			element.textContent = text;
		}
		return element;
	}

}
