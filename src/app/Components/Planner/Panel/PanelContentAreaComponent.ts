import {AfterViewChecked, AfterViewInit, Component, ElementRef, Input, OnDestroy, Signal, ViewChild, ChangeDetectionStrategy, signal} from '@angular/core';
import {NgComponentOutlet} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {faAnglesRight, faXmark} from '@fortawesome/free-solid-svg-icons';
import {PanelDefinition} from '@src/Components/Planner/Panel/PanelDefinition';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {PanelSide} from '@src/Components/Planner/Panel/PanelSide';
import {TabOverflowMeasurer} from '@src/Components/Planner/Panel/TabOverflowMeasurer';

const OVERFLOW_BUTTON_WIDTH = 30;

@Component({
	selector: 'panel-content-area',
	templateUrl: './PanelContentAreaComponent.html',
	imports: [NgComponentOutlet, FaIconComponent, BsDropdownModule, TooltipDirective],
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host { display: block; width: 100%; height: 100%; position: relative; }
		.area {
			position: relative;
			width: 100%;
			height: 100%;
			background: #141824;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
		.tabbar {
			position: relative;
			display: flex;
			align-items: stretch;
			height: 36px;
			flex: none;
			background: #10141d;
			border-bottom: 1px solid #222b3e;
			user-select: none;
		}
		.tabs {
			display: flex;
			align-items: stretch;
			flex: 1;
			min-width: 0;
			overflow: hidden;
		}
		.tab {
			display: flex;
			align-items: center;
			flex: none;
			gap: 5px;
			padding: 0 7px 0 12px;
			border-right: 1px solid #1a2030;
			color: #8899bb;
			font-size: 1rem;
			cursor: grab;
			white-space: nowrap;
		}
		.tab:active { cursor: grabbing; }
		.tab:hover { background: rgba(255,255,255,0.05); color: #ccd6ee; }
		.tab.active {
			background: #141824;
			color: #fff;
			box-shadow: inset 0 2px 0 rgba(100,150,255,0.7);
		}
		.tab-icon { font-size: 14px; opacity: 0.75; flex: none; }
		.tab-label { overflow: hidden; text-overflow: ellipsis; }
		.tab-close {
			width: 18px;
			height: 18px;
			display: flex;
			align-items: center;
			justify-content: center;
			border: none;
			border-radius: 3px;
			background: transparent;
			color: #566079;
			font-size: 14px;
			line-height: 1;
			cursor: pointer;
			flex: none;
		}
		.tab:hover .tab-close, .tab.active .tab-close { color: #8899bb; }
		.tab-close:hover { background: rgba(255,255,255,0.12); color: #fff; }
		.tab-overflow { display: flex; flex: none; }
		.tab-more {
			width: 30px;
			display: flex;
			align-items: center;
			justify-content: center;
			border: none;
			border-left: 1px solid #1a2030;
			background: transparent;
			color: #8899bb;
			font-size: 12px;
			cursor: pointer;
		}
		.tab-more:hover { background: rgba(255,255,255,0.05); color: #ccd6ee; }
		.tab-more.active { color: #fff; box-shadow: inset 0 2px 0 rgba(100,150,255,0.7); }
		.tab-measure {
			position: absolute;
			top: -9999px;
			left: 0;
			height: 36px;
			flex: none;
			overflow: visible;
			visibility: hidden;
			pointer-events: none;
		}
		.area-border-right  { border-right:  3px solid rgba(80, 120, 200, 0.45); }
		.area-border-left   { border-left:   3px solid rgba(80, 120, 200, 0.45); }
		.area-border-bottom { border-bottom: 3px solid rgba(80, 120, 200, 0.45); }
		.area-scroll {
			flex: 1;
			overflow-y: auto;
			overflow-x: hidden;
		}
		.resize-handle {
			position: absolute;
			background: transparent;
			z-index: 2;
			transition: background 0.15s;
		}
		.resize-handle:hover, .resize-handle.resizing {
			background: rgba(80, 130, 255, 0.35);
		}
		.rh-right  { right:  -6px; top: 0; bottom: 0; width:  12px; cursor: ew-resize; touch-action: none; }
		.rh-left   { left:   -6px; top: 0; bottom: 0; width:  12px; cursor: ew-resize; touch-action: none; }
		.rh-bottom { bottom: -6px; left: 0; right:  0; height: 12px; cursor: ns-resize; touch-action: none; }
	`],
})
export class PanelContentAreaComponent implements AfterViewInit, AfterViewChecked, OnDestroy
{

	@Input() public side!: PanelSide;

	public readonly faAnglesRight = faAnglesRight;
	public readonly faXmark = faXmark;

	public isResizing = false;

	@ViewChild('tabbarEl') private tabbarRef?: ElementRef<HTMLElement>;
	@ViewChild('measureEl') private measureRef?: ElementRef<HTMLElement>;

	private readonly measurer = new TabOverflowMeasurer();
	private resizeObserver: ResizeObserver | null = null;

	private readonly visibleTabCountSignal = signal(Number.MAX_SAFE_INTEGER);
	public readonly visibleTabCount: Signal<number> = this.visibleTabCountSignal.asReadonly();

	public constructor(public readonly layout: PanelLayoutService)
	{
	}

	public ngAfterViewInit(): void
	{
		if (this.tabbarRef) {
			this.resizeObserver = new ResizeObserver(() => this.recomputeTabOverflow());
			this.resizeObserver.observe(this.tabbarRef.nativeElement);
		}
		this.recomputeTabOverflow();
	}

	/** Re-measures after every render so newly opened/closed tabs are picked up. */
	public ngAfterViewChecked(): void
	{
		this.recomputeTabOverflow();
	}

	public ngOnDestroy(): void
	{
		this.resizeObserver?.disconnect();
	}

	public get visibleTabs(): PanelDefinition[]
	{
		return this.tabs.slice(0, this.visibleTabCount());
	}

	public get overflowTabs(): PanelDefinition[]
	{
		return this.tabs.slice(this.visibleTabCount());
	}

	public get overflowHasActive(): boolean
	{
		const activeId = this.activePanel?.id;
		return this.overflowTabs.some(tab => tab.id === activeId);
	}

	/** Moves the picked tab to the front so the selection is always visible. */
	public selectOverflowTab(panelId: string): void
	{
		this.layout.moveTabToFront(this.side, panelId);
		this.layout.selectTab(this.side, panelId);
	}

	private recomputeTabOverflow(): void
	{
		const bar = this.tabbarRef?.nativeElement;
		const measure = this.measureRef?.nativeElement;
		if (!bar || !measure) return;
		const widths = Array.from(measure.children).map(child => child.getBoundingClientRect().width);
		const count = this.measurer.fit(bar.clientWidth, widths, OVERFLOW_BUTTON_WIDTH);
		if (count !== this.visibleTabCountSignal()) {
			this.visibleTabCountSignal.set(count);
		}
	}

	public get activePanel(): PanelDefinition | null
	{
		switch (this.side) {
			case 'left':  return this.layout.activeLeft();
			case 'right': return this.layout.activeRight();
			case 'top':   return this.layout.activeTop();
		}
	}

	public get tabs(): PanelDefinition[]
	{
		return this.layout.tabsFor(this.side);
	}

	public get borderClass(): string
	{
		switch (this.side) {
			case 'left':  return 'area-border-right';
			case 'right': return 'area-border-left';
			case 'top':   return 'area-border-bottom';
		}
	}

	public get handleClass(): string
	{
		switch (this.side) {
			case 'left':  return 'rh-right';
			case 'right': return 'rh-left';
			case 'top':   return 'rh-bottom';
		}
	}

	/**
	 * A tab is both a selector and a drag handle: releasing without crossing
	 * the drag threshold selects it; dragging past the threshold unpins that
	 * panel into a floating one following the cursor, and releasing over an
	 * edge drop zone docks it there as a tab.
	 */
	public onTabPointerDown(event: PointerEvent, panelId: string): void
	{
		event.preventDefault();

		const startClientX = event.clientX;
		const startClientY = event.clientY;
		let unpinned = false;

		const onMove = (e: PointerEvent): void => {
			if (!unpinned) {
				if (Math.abs(e.clientX - startClientX) + Math.abs(e.clientY - startClientY) < 8) return;
				unpinned = true;
				this.layout.floatPanel(panelId);
			}
			const point = this.layout.pointerToContent(e.clientX, e.clientY);
			this.layout.dragFloatingTo(panelId, point.x, point.y);
			this.layout.updateDragPreview(point.x, point.y, this.layout.groupIdOf(panelId));
		};

		const onUp = (): void => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
			if (unpinned) {
				this.layout.completeFloatDrag(panelId);
			} else {
				this.layout.selectTab(this.side, panelId);
			}
		};

		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	}

	public onResizeStart(event: PointerEvent): void
	{
		event.preventDefault();
		(event.target as HTMLElement).setPointerCapture(event.pointerId);
		const startX = event.clientX;
		const startY = event.clientY;
		const startSize = this.layout.sizes()[this.side];
		this.isResizing = true;

		const onMove = (e: PointerEvent): void => {
			let newSize: number;
			if (this.side === 'left') {
				newSize = startSize + (e.clientX - startX);
			} else if (this.side === 'right') {
				newSize = startSize - (e.clientX - startX);
			} else {
				newSize = startSize + (e.clientY - startY);
			}
			this.layout.setSize(this.side, newSize);
		};

		const onUp = (): void => {
			this.isResizing = false;
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
		};

		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	}

}
