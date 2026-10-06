import {Directive, ElementRef, Input, OnDestroy, OnInit} from '@angular/core';

/** `vh` ignores a phone's on-screen keyboard but the visual viewport shrinks, so the height comes from there. A change also fires a window resize, since ngx-bootstrap menus follow those and iOS does not fire one for the keyboard. */
@Directive({
	selector: '[fitViewport]',
})
export class FitViewportDirective implements OnInit, OnDestroy
{

	@Input() public fitViewportReserve = 180;

	@Input() public fitViewportMax = 320;

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
