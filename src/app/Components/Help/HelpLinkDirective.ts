import {Directive, HostBinding, HostListener, Input} from '@angular/core';
import {Router} from '@angular/router';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';

/**
 * The one way help content links to help paths: `<a helpLink="first-plan">`.
 * Resolves through the host's HelpNavigation, so the same template yields a
 * `?help=` link inside the planner panel and a `/help/…` link on the
 * fullscreen page. Behaves like a real anchor (href, new-tab clicks).
 */
@Directive({selector: 'a[helpLink]'})
export class HelpLinkDirective
{

	@Input({required: true}) public helpLink = '';

	// urlTree() runs on every change-detection pass via the href binding;
	// cache by input + current URL so long article lists stay cheap.
	private cachedKey: string | null = null;
	private cachedHref = '';

	public constructor(
		private readonly navigation: HelpNavigation,
		private readonly router: Router,
	)
	{
	}

	@HostBinding('attr.href')
	public get href(): string
	{
		const key = `${this.helpLink}|${this.router.url}`;
		if (key !== this.cachedKey) {
			this.cachedKey = key;
			this.cachedHref = this.router.serializeUrl(this.navigation.urlTree(this.helpLink));
		}
		return this.cachedHref;
	}

	@HostListener('click', ['$event'])
	public onClick(event: MouseEvent): boolean
	{
		// Modified or non-primary clicks fall through to the browser (new tab etc.).
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
			return true;
		}
		void this.navigation.navigate(this.helpLink);
		return false;
	}

}
