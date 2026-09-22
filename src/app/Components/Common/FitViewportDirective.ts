import {Directive, ElementRef, Input, OnDestroy, OnInit} from '@angular/core';

/**
 * Caps a scrolling list at the room actually on screen.
 *
 * `vh` is no help on a phone: the on-screen keyboard covers most of the
 * window without changing it, so a list sized that way runs off underneath.
 * The visual viewport does shrink, so the height comes from there, and a
 * change in it also nudges the page to reposition anything anchored to an
 * element (ngx-bootstrap menus follow window resizes, which iOS does not
 * fire for the keyboard).
 */
@Directive({
	selector: '[fitViewport]',
})
export class FitViewportDirective implements OnInit, OnDestroy
{

	/** Room to leave for whatever sits above and below the list. */
	@Input() public fitViewportReserve = 180;

	/** The list never grows past this, however tall the screen is. */
	@Input() public fitViewportMax = 320;

	/** …and never shrinks below this, so a couple of rows always show. */
	@Input() public fitViewportMin = 120;

	private readonly listener: () => void;

	private applied = 0;

	public constructor(private readonly elementRef: ElementRef<HTMLElement>)
	{
		this.listener = (): void => this.apply();
	}

	public ngOnInit(): void
	{
		this.apply();
		window.addEventListener('resize', this.listener);
		window.visualViewport?.addEventListener('resize', this.listener);
	}

	public ngOnDestroy(): void
	{
		window.removeEventListener('resize', this.listener);
		window.visualViewport?.removeEventListener('resize', this.listener);
	}

	private apply(): void
	{
		const available = window.visualViewport?.height ?? window.innerHeight;
		const height = Math.round(Math.min(this.fitViewportMax, Math.max(this.fitViewportMin, available - this.fitViewportReserve)));
		if (height === this.applied) {
			return;
		}
		this.applied = height;
		this.elementRef.nativeElement.style.maxHeight = `${height}px`;
		this.elementRef.nativeElement.style.overflowY = 'auto';
		// Only on a real change, so this can never feed itself.
		window.dispatchEvent(new Event('resize'));
	}

}
