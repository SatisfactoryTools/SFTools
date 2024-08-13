import {Directive, ElementRef, HostListener, Input} from '@angular/core';

/**
 * Shows the given text as a native browser tooltip, but only while the
 * host's content is actually truncated (text-truncate overflow) - names
 * that fit need no tooltip.
 */
@Directive({selector: '[truncateTitle]'})
export class TruncateTitleDirective
{

	@Input({required: true}) public truncateTitle = '';

	public constructor(private readonly element: ElementRef<HTMLElement>)
	{
	}

	@HostListener('mouseenter')
	public onMouseEnter(): void
	{
		const host = this.element.nativeElement;
		if (host.scrollWidth > host.clientWidth) {
			host.title = this.truncateTitle;
		} else {
			host.removeAttribute('title');
		}
	}

}
