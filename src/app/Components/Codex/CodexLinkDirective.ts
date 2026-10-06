import {Directive, HostBinding, HostListener, Input} from '@angular/core';
import {Router} from '@angular/router';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';

@Directive({selector: 'a[codexLink]'})
export class CodexLinkDirective
{

	@Input({required: true}) public codexLink = '';

	// urlTree() runs on every change-detection pass via the href binding; cached so lists of hundreds of links stay cheap.
	private cachedKey: string | null = null;
	private cachedHref = '';

	public constructor(
		private readonly navigation: CodexNavigation,
		private readonly router: Router,
	)
	{
	}

	@HostBinding('attr.href')
	public get href(): string
	{
		const key = `${this.codexLink}|${this.router.url}`;
		if (key !== this.cachedKey) {
			this.cachedKey = key;
			this.cachedHref = this.router.serializeUrl(this.navigation.urlTree(this.codexLink));
		}
		return this.cachedHref;
	}

	@HostListener('click', ['$event'])
	public onClick(event: MouseEvent): boolean
	{
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
			return true;
		}
		void this.navigation.navigate(this.codexLink);
		return false;
	}

}
