import {AfterViewInit, Directive, ElementRef} from '@angular/core';

/** Unlike a @ViewChild focus this fires every time the element is instantiated, e.g. a container="body" menu. */
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
