import {Directive, ElementRef, HostListener, Input} from '@angular/core';

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
