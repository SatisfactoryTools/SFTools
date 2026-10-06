import {Directive, HostBinding, HostListener, Input} from '@angular/core';
import {Router} from '@angular/router';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';

@Directive({selector: 'a[helpLink]'})
export class HelpLinkDirective
{

	@Input({required: true}) public helpLink = '';

	// urlTree() runs on every change-detection pass via the href binding; cached so long article lists stay cheap.
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
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
			return true;
		}
		void this.navigation.navigate(this.helpLink);
		return false;
	}

}
