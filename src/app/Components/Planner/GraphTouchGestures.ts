import {GraphTouchGestureHandlers} from '@src/Components/Planner/GraphTouchGestureHandlers';

const LONG_PRESS_MS = 500;
const TAP_MAX_MS = 350;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_RADIUS = 30;
const MOVE_TOLERANCE = 10;

/**
 * Touch-screen gestures for the graph canvas, which x6 lacks: two-finger
 * pinch zoom, double tap (add node / inspect) and long press (context menu).
 *
 * Blank-canvas touches are kept away from x6 (stopPropagation in the capture
 * phase) so its own single-finger panning does not fight the pinch; the pan
 * is re-implemented here. Touches on cells still reach x6, so node dragging
 * and tap-to-select keep working. After a recognised long press or double
 * tap the touchend is cancelled, which also suppresses the browser's
 * synthesized mouse events - a synthesized mousedown would otherwise close
 * the context menu the long press just opened.
 */
export class GraphTouchGestures
{

	private start: {x: number; y: number; time: number; target: Element; onCell: boolean} | null = null;
	private last: {x: number; y: number} | null = null;
	private moved = false;
	private longPressTimer: ReturnType<typeof setTimeout> | null = null;
	/** A long press (ours or the browser's native contextmenu) happened in this touch - swallow its end. */
	private pressHandled = false;
	private pinch: {distance: number; centerX: number; centerY: number} | null = null;
	private lastTap: {x: number; y: number; time: number} | null = null;

	private readonly touchStartListener = (event: TouchEvent) => this.onTouchStart(event);
	private readonly touchMoveListener = (event: TouchEvent) => this.onTouchMove(event);
	private readonly touchEndListener = (event: TouchEvent) => this.onTouchEnd(event);
	private readonly contextMenuListener = () => this.onNativeContextMenu();

	public constructor(
		private readonly container: HTMLElement,
		private readonly handlers: GraphTouchGestureHandlers,
	)
	{
	}

	public attach(): void
	{
		// No browser panning/zooming of the page itself, and no double-tap zoom.
		this.container.style.touchAction = 'none';
		this.container.addEventListener('touchstart', this.touchStartListener, {capture: true, passive: false});
		this.container.addEventListener('touchmove', this.touchMoveListener, {capture: true, passive: false});
		this.container.addEventListener('touchend', this.touchEndListener, {capture: true, passive: false});
		this.container.addEventListener('touchcancel', this.touchEndListener, {capture: true, passive: false});
		this.container.addEventListener('contextmenu', this.contextMenuListener, {capture: true});
	}

	public detach(): void
	{
		this.cancelLongPress();
		this.container.removeEventListener('touchstart', this.touchStartListener, {capture: true});
		this.container.removeEventListener('touchmove', this.touchMoveListener, {capture: true});
		this.container.removeEventListener('touchend', this.touchEndListener, {capture: true});
		this.container.removeEventListener('touchcancel', this.touchEndListener, {capture: true});
		this.container.removeEventListener('contextmenu', this.contextMenuListener, {capture: true});
	}

	private onTouchStart(event: TouchEvent): void
	{
		if (event.touches.length === 1) {
			const touch = event.touches[0];
			const target = event.target instanceof Element ? event.target : this.container;
			const onCell = this.handlers.isCellElement(target);
			this.start = {x: touch.clientX, y: touch.clientY, time: performance.now(), target, onCell};
			this.last = {x: touch.clientX, y: touch.clientY};
			this.moved = false;
			this.pressHandled = false;
			this.pinch = null;
			if (!onCell) {
				event.stopPropagation();
			}
			this.cancelLongPress();
			this.longPressTimer = setTimeout(() => {
				this.longPressTimer = null;
				if (this.start && !this.moved && !this.pinch) {
					this.pressHandled = true;
					this.handlers.onLongPress(this.start.x, this.start.y, this.start.target);
				}
			}, LONG_PRESS_MS);
			return;
		}

		if (event.touches.length === 2) {
			event.stopPropagation();
			this.cancelLongPress();
			this.lastTap = null;
			const [a, b] = [event.touches[0], event.touches[1]];
			this.pinch = {
				distance: this.distance(a, b),
				centerX: (a.clientX + b.clientX) / 2,
				centerY: (a.clientY + b.clientY) / 2,
			};
		}
	}

	private onTouchMove(event: TouchEvent): void
	{
		if (this.pinch && event.touches.length >= 2) {
			event.preventDefault();
			event.stopPropagation();
			const [a, b] = [event.touches[0], event.touches[1]];
			const distance = this.distance(a, b);
			const centerX = (a.clientX + b.clientX) / 2;
			const centerY = (a.clientY + b.clientY) / 2;
			if (this.pinch.distance > 0) {
				this.handlers.onPinch(distance / this.pinch.distance, centerX, centerY);
			}
			this.handlers.onPan(centerX - this.pinch.centerX, centerY - this.pinch.centerY);
			this.pinch = {distance, centerX, centerY};
			return;
		}

		if (!this.start || !this.last || event.touches.length !== 1) {
			return;
		}
		const touch = event.touches[0];
		if (Math.hypot(touch.clientX - this.start.x, touch.clientY - this.start.y) > MOVE_TOLERANCE) {
			this.moved = true;
			this.cancelLongPress();
		}
		if (!this.start.onCell) {
			event.preventDefault();
			event.stopPropagation();
			this.handlers.onPan(touch.clientX - this.last.x, touch.clientY - this.last.y);
		}
		this.last = {x: touch.clientX, y: touch.clientY};
	}

	private onTouchEnd(event: TouchEvent): void
	{
		this.cancelLongPress();

		if (this.pinch) {
			event.stopPropagation();
			if (event.touches.length < 2) {
				this.pinch = null;
			}
			if (event.touches.length === 0) {
				this.start = null;
			}
			// A finger lifted after pinching is not a tap.
			this.lastTap = null;
			return;
		}

		if (this.pressHandled) {
			event.preventDefault();
			this.pressHandled = false;
			this.start = null;
			return;
		}

		const start = this.start;
		this.start = null;
		if (!start || this.moved) {
			return;
		}
		if (!start.onCell) {
			event.stopPropagation();
		}
		const now = performance.now();
		if (now - start.time > TAP_MAX_MS) {
			return;
		}
		const previous = this.lastTap;
		if (previous && now - previous.time < DOUBLE_TAP_MS && Math.hypot(previous.x - start.x, previous.y - start.y) < DOUBLE_TAP_RADIUS) {
			event.preventDefault();
			this.lastTap = null;
			this.handlers.onDoubleTap(start.x, start.y, start.target);
			return;
		}
		this.lastTap = {x: start.x, y: start.y, time: now};
	}

	/** The browser opened a context menu itself (Android long press) - do not open a second one. */
	private onNativeContextMenu(): void
	{
		if (this.start) {
			this.cancelLongPress();
			this.pressHandled = true;
		}
	}

	private cancelLongPress(): void
	{
		if (this.longPressTimer !== null) {
			clearTimeout(this.longPressTimer);
			this.longPressTimer = null;
		}
	}

	private distance(a: Touch, b: Touch): number
	{
		return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
	}

}
