import {Directive, ElementRef, HostListener, OnDestroy} from '@angular/core';

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

/** Android already turns a long press into a native contextmenu, which cancels the timer; touchend is cancelled either way so the synthesized click does not close the menu just opened. */
@Directive({
	selector: '[longPressContextMenu]',
})
export class LongPressContextMenuDirective implements OnDestroy
{

	private timer: ReturnType<typeof setTimeout> | null = null;
	private start: {x: number; y: number} | null = null;
	private fired = false;
	private dispatching = false;

	public constructor(private readonly elementRef: ElementRef<HTMLElement>)
	{
	}

	public ngOnDestroy(): void
	{
		this.cancel();
	}

	@HostListener('touchstart', ['$event'])
	public onTouchStart(event: TouchEvent): void
	{
		if (event.touches.length !== 1) {
			this.cancel();
			return;
		}
		const touch = event.touches[0];
		this.start = {x: touch.clientX, y: touch.clientY};
		this.fired = false;
		this.cancel();
		this.timer = setTimeout(() => {
			this.timer = null;
			if (this.start) {
				this.fired = true;
				this.dispatching = true;
				this.elementRef.nativeElement.dispatchEvent(new MouseEvent('contextmenu', {
					bubbles: true,
					cancelable: true,
					clientX: this.start.x,
					clientY: this.start.y,
				}));
				this.dispatching = false;
			}
		}, LONG_PRESS_MS);
	}

	@HostListener('touchmove', ['$event'])
	public onTouchMove(event: TouchEvent): void
	{
		const touch = event.touches[0];
		if (this.start && touch && Math.hypot(touch.clientX - this.start.x, touch.clientY - this.start.y) > MOVE_TOLERANCE) {
			this.cancel();
			this.start = null;
		}
	}

	@HostListener('touchend', ['$event'])
	@HostListener('touchcancel', ['$event'])
	public onTouchEnd(event: TouchEvent): void
	{
		this.cancel();
		this.start = null;
		if (this.fired) {
			this.fired = false;
			event.preventDefault();
		}
	}

	@HostListener('contextmenu')
	public onContextMenu(): void
	{
		if (!this.dispatching && this.start) {
			// Native long-press menu - ours must not follow.
			this.cancel();
			this.fired = true;
		}
	}

	private cancel(): void
	{
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

}
