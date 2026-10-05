import {Directive, EventEmitter, HostListener, Input, OnDestroy, Output} from '@angular/core';

const HOLD_MS = 500;
const MOVE_TOLERANCE = 10;

/** A finger starts no native HTML drag, so holding the host picks it up instead. Shares the hold with LongPressContextMenuDirective: lifting leaves the menu, moving drags (the host closes the menu on the first move). */
@Directive({
	selector: '[longPressDrag]',
})
export class LongPressDragDirective implements OnDestroy
{

	@Input() public longPressDrag: boolean | '' = '';

	@Output() public readonly dragPick = new EventEmitter<void>();
	@Output() public readonly dragMove = new EventEmitter<Touch>();
	@Output() public readonly dragDrop = new EventEmitter<Touch>();
	@Output() public readonly dragCancel = new EventEmitter<void>();

	private timer: ReturnType<typeof setTimeout> | null = null;
	private start: {x: number; y: number} | null = null;
	private held = false;
	private moving = false;

	public ngOnDestroy(): void
	{
		this.cancelTimer();
		if (this.held) {
			this.dragCancel.emit();
		}
	}

	@HostListener('touchstart', ['$event'])
	public onTouchStart(event: TouchEvent): void
	{
		this.reset();
		if (this.longPressDrag === false || event.touches.length !== 1) {
			return;
		}
		const touch = event.touches[0];
		this.start = {x: touch.clientX, y: touch.clientY};
		this.timer = setTimeout(() => {
			this.timer = null;
			if (this.start) {
				this.held = true;
				this.dragPick.emit();
			}
		}, HOLD_MS);
	}

	@HostListener('touchmove', ['$event'])
	public onTouchMove(event: TouchEvent): void
	{
		const touch = event.touches[0];
		if (!this.start || !touch) {
			return;
		}
		const far = Math.hypot(touch.clientX - this.start.x, touch.clientY - this.start.y) > MOVE_TOLERANCE;
		if (!this.held) {
			// Still waiting for the hold: this is the list being scrolled.
			if (far) {
				this.cancelTimer();
				this.start = null;
			}
			return;
		}
		// The row is held - the browser must not scroll the list under it.
		event.preventDefault();
		if (!this.moving && !far) {
			return;
		}
		this.moving = true;
		this.dragMove.emit(touch);
	}

	@HostListener('touchend', ['$event'])
	public onTouchEnd(event: TouchEvent): void
	{
		const touch = event.changedTouches[0];
		if (this.held) {
			// No synthesized click after a drag - the row must not open as well.
			event.preventDefault();
			if (this.moving && touch) {
				this.dragDrop.emit(touch);
			} else {
				this.dragCancel.emit();
			}
		}
		this.reset();
	}

	@HostListener('touchcancel')
	public onTouchCancel(): void
	{
		if (this.held) {
			this.dragCancel.emit();
		}
		this.reset();
	}

	private reset(): void
	{
		this.cancelTimer();
		this.start = null;
		this.held = false;
		this.moving = false;
	}

	private cancelTimer(): void
	{
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

}
