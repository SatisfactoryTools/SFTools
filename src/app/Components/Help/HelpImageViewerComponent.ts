import {Component, ChangeDetectionStrategy, ElementRef, HostListener, ViewChild, computed, effect, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMagnifyingGlassMinus, faMagnifyingGlassPlus} from '@fortawesome/free-solid-svg-icons';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {HelpImageViewerService} from '@src/Model/Help/HelpImageViewerService';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 350;
const TAP_TOLERANCE = 10;

@Component({
	selector: 'help-image-viewer',
	templateUrl: './HelpImageViewerComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, HotkeyBlockDirective],
	styles: `
		.viewer {
			position: fixed;
			inset: 0;
			z-index: 1080;
			display: flex;
			flex-direction: column;
			background: rgba(0, 0, 0, 0.94);
		}
		.viewer-tools {
			display: flex;
			flex: none;
			align-items: center;
			justify-content: flex-end;
			gap: 0.25rem;
			padding: 0.4rem 0.6rem;
		}
		.viewer-zoom {
			min-width: 3.5rem;
			text-align: center;
			color: #9fb0c0;
			font-size: 0.85rem;
		}
		.viewer-stage {
			display: flex;
			flex: 1;
			min-height: 0;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			touch-action: none;
		}
		.viewer-stage.zoomed {
			cursor: grab;
		}
		.viewer-image {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
			transform-origin: center center;
			user-select: none;
			-webkit-user-drag: none;
		}
		.viewer-caption {
			flex: none;
			padding: 0.6rem 1rem 1.1rem;
			color: #dfe7ef;
			font-size: 0.9rem;
			text-align: center;
		}
	`,
})
export class HelpImageViewerComponent
{

	protected readonly faZoomIn = faMagnifyingGlassPlus;
	protected readonly faZoomOut = faMagnifyingGlassMinus;

	private readonly scaleSignal = signal(MIN_SCALE);
	private readonly offsetXSignal = signal(0);
	private readonly offsetYSignal = signal(0);

	protected readonly zoomed = computed(() => this.scaleSignal() > MIN_SCALE);
	protected readonly canZoomIn = computed(() => this.scaleSignal() < MAX_SCALE);
	protected readonly canZoomOut = computed(() => this.scaleSignal() > MIN_SCALE);
	protected readonly percentage = computed(() => Math.round(this.scaleSignal() * 100));
	protected readonly transform = computed(
		() => `translate(${this.offsetXSignal()}px, ${this.offsetYSignal()}px) scale(${this.scaleSignal()})`,
	);

	@ViewChild('stage') private stage: ElementRef<HTMLElement> | undefined;
	@ViewChild('image') private picture: ElementRef<HTMLImageElement> | undefined;

	private readonly pointers = new Map<number, {x: number; y: number}>();
	private pinch: {distance: number; x: number; y: number} | null = null;
	private pressStart: {x: number; y: number; onPicture: boolean} | null = null;
	private dragged = false;
	private lastTap = 0;

	public constructor(protected readonly viewer: HelpImageViewerService)
	{
		effect(() => {
			this.viewer.image();
			this.reset();
		});
	}

	@HostListener('document:keydown.escape')
	protected onEscape(): void
	{
		this.close();
	}

	protected close(): void
	{
		this.viewer.close();
	}

	protected zoomIn(): void
	{
		this.zoomAtCentre(this.scaleSignal() * ZOOM_STEP);
	}

	protected zoomOut(): void
	{
		this.zoomAtCentre(this.scaleSignal() / ZOOM_STEP);
	}

	protected onWheel(event: WheelEvent): void
	{
		// The page behind must not scroll, whether the wheel zooms or not.
		event.preventDefault();
		this.zoomAt(event.clientX, event.clientY, this.scaleSignal() * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP));
	}

	protected onPointerDown(event: PointerEvent): void
	{
		this.stage?.nativeElement.setPointerCapture(event.pointerId);
		this.pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
		this.pressStart = {x: event.clientX, y: event.clientY, onPicture: event.target === this.picture?.nativeElement};
		this.dragged = false;
		this.pinch = null;
		// No text selection or native image drag while panning.
		event.preventDefault();
	}

	protected onPointerMove(event: PointerEvent): void
	{
		const previous = this.pointers.get(event.pointerId);
		if (previous === undefined) {
			return;
		}
		this.pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});

		if (this.pressStart !== null
			&& Math.hypot(event.clientX - this.pressStart.x, event.clientY - this.pressStart.y) > TAP_TOLERANCE) {
			this.dragged = true;
		}

		if (this.pointers.size >= 2) {
			this.pinchMove();
			return;
		}
		if (this.zoomed()) {
			this.panBy(event.clientX - previous.x, event.clientY - previous.y);
		}
	}

	protected onPointerUp(event: PointerEvent): void
	{
		this.pointers.delete(event.pointerId);
		if (this.pointers.size < 2) {
			this.pinch = null;
		}
		if (this.pointers.size > 0) {
			return;
		}

		const press = this.pressStart;
		this.pressStart = null;
		if (press === null || this.dragged) {
			return;
		}

		if (!press.onPicture) {
			this.close();
			return;
		}

		const now = performance.now();
		if (now - this.lastTap < DOUBLE_TAP_MS) {
			this.lastTap = 0;
			if (this.zoomed()) {
				this.reset();
			} else {
				this.zoomAt(event.clientX, event.clientY, DOUBLE_TAP_SCALE);
			}
			return;
		}
		this.lastTap = now;
	}

	private pinchMove(): void
	{
		const [first, second] = [...this.pointers.values()];
		const distance = Math.hypot(first.x - second.x, first.y - second.y);
		const x = (first.x + second.x) / 2;
		const y = (first.y + second.y) / 2;

		if (this.pinch !== null && this.pinch.distance > 0) {
			this.zoomAt(x, y, this.scaleSignal() * distance / this.pinch.distance);
			this.panBy(x - this.pinch.x, y - this.pinch.y);
		}
		this.pinch = {distance, x, y};
	}

	private reset(): void
	{
		this.scaleSignal.set(MIN_SCALE);
		this.offsetXSignal.set(0);
		this.offsetYSignal.set(0);
	}

	private zoomAtCentre(scale: number): void
	{
		const rect = this.stage?.nativeElement.getBoundingClientRect();
		if (rect === undefined) {
			return;
		}
		this.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale);
	}

	private zoomAt(x: number, y: number, wanted: number): void
	{
		const stage = this.stage?.nativeElement;
		if (stage === undefined) {
			return;
		}

		const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, wanted));
		const ratio = scale / this.scaleSignal();
		const rect = stage.getBoundingClientRect();
		// The picture sits in the middle of the stage before it is moved, so the point to keep still is measured from there.
		const fromCentreX = x - (rect.left + rect.width / 2);
		const fromCentreY = y - (rect.top + rect.height / 2);

		this.scaleSignal.set(scale);
		this.moveTo(
			fromCentreX * (1 - ratio) + this.offsetXSignal() * ratio,
			fromCentreY * (1 - ratio) + this.offsetYSignal() * ratio,
		);
	}

	private panBy(x: number, y: number): void
	{
		this.moveTo(this.offsetXSignal() + x, this.offsetYSignal() + y);
	}

	private moveTo(x: number, y: number): void
	{
		const stage = this.stage?.nativeElement;
		const picture = this.picture?.nativeElement;
		if (stage === undefined || picture === undefined) {
			this.offsetXSignal.set(x);
			this.offsetYSignal.set(y);
			return;
		}

		const scale = this.scaleSignal();
		const limitX = Math.max(0, (picture.offsetWidth * scale - stage.clientWidth) / 2);
		const limitY = Math.max(0, (picture.offsetHeight * scale - stage.clientHeight) / 2);
		this.offsetXSignal.set(Math.min(limitX, Math.max(-limitX, x)));
		this.offsetYSignal.set(Math.min(limitY, Math.max(-limitY, y)));
	}

}
