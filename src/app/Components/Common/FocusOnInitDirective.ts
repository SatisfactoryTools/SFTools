import {AfterViewInit, Directive, ElementRef} from '@angular/core';

/**
 * Focuses the host element once it is created. Unlike a @ViewChild-driven
 * focus, this fires every time the element is instantiated - so it keeps
 * working for content that is destroyed and recreated (e.g. a dropdown menu
 * rendered with container="body" each time it opens).
 */
@Directive({
	selector: '[focusOnInit]',
})
export class FocusOnInitDirective implements AfterViewInit
{

	public constructor(private readonly host: ElementRef<HTMLElement>)
	{
	}

	public ngAfterViewInit(): void
	{
		// Deferred a tick so the element is laid out (the dropdown positions on the body first).
		setTimeout(() => this.host.nativeElement.focus());
	}

}
