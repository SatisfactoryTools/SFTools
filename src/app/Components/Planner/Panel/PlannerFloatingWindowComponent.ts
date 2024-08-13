import {AfterViewChecked, AfterViewInit, Component, ElementRef, Input, OnDestroy, Signal, ViewChild, ChangeDetectionStrategy, signal} from '@angular/core';
import {NgComponentOutlet} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {faAnglesRight, faXmark} from '@fortawesome/free-solid-svg-icons';
import {FloatingGroup} from '@src/Components/Planner/Panel/FloatingGroup';
import {PanelDefinition} from '@src/Components/Planner/Panel/PanelDefinition';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {TabOverflowMeasurer} from '@src/Components/Planner/Panel/TabOverflowMeasurer';

const OVERFLOW_BUTTON_WIDTH = 30;

@Component({
	selector: 'planner-floating-window',
	templateUrl: './PlannerFloatingWindowComponent.html',
	imports: [NgComponentOutlet, FaIconComponent, BsDropdownModule, TooltipDirective],
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host {
			position: relative;
			display: flex;
			flex-direction: column;
			width: 100%;
			height: 100%;
			background: #141824;
			border: 1px solid #2c3650;
			border-radius: 8px;
			overflow: hidden;
			box-shadow: 0 12px 30px rgba(0,0,0,0.5);
		}
		.fw-tabbar {
			display: flex;
			align-items: stretch;
			height: 36px;
			flex: none;
			background: #10141d;
			border-bottom: 1px solid #222b3e;
			user-select: none;
			cursor: move;
		}
		.fw-tabs {
			display: flex;
			align-items: stretch;
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
		.fw-grab { flex: 1; }
		.fw-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; }
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
		.fw-resize-e {
			position: absolute;
			top: 36px; right: 0; bottom: 10px;
			width: 6px;
			cursor: ew-resize;
			z-index: 2;
		}
		.fw-resize-s {
			position: absolute;
			left: 0; right: 10px; bottom: 0;
			height: 6px;
			cursor: ns-resize;
			z-index: 2;
		}
		.fw-resize-se {
			position: absolute;
			right: 0; bottom: 0;
			width: 14px; height: 14px;
			cursor: nwse-resize;
			z-index: 2;
		}
	`],
})
export class PlannerFloatingWindowComponent implements AfterViewInit, AfterViewChecked, OnDestroy
{

	@Input() public group!: FloatingGroup;

	public readonly faAnglesRight = faAnglesRight;
	public readonly faXmark = faXmark;

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

	/** Re-measures after every render so tab and window size changes are picked up. */
	public ngAfterViewChecked(): void
	{
		this.recomputeTabOverflow();
	}

	public ngOnDestroy(): void
	{
		this.resizeObserver?.disconnect();
	}

	public get tabs(): PanelDefinition[]
	{
		return this.layout.panelsInGroup(this.group);
	}

	public get activePanel(): PanelDefinition | null
	{
		return this.tabs.find(t => t.id === this.group.activeTabId) ?? null;
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
		return this.overflowTabs.some(tab => tab.id === this.group.activeTabId);
	}

	/** Moves the picked tab to the front so the selection is always visible. */
	public selectOverflowTab(panelId: string): void
	{
		this.layout.moveFloatingTabToFront(this.group.id, panelId);
		this.layout.selectFloatingTab(this.group.id, panelId);
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

	/** Dragging the tab-bar background moves the whole window. */
	public onWindowDragStart(event: PointerEvent): void
	{
		event.preventDefault();
		const startClientX = event.clientX;
		const startClientY = event.clientY;
		const startX = this.group.x;
		const startY = this.group.y;
		const groupId = this.group.id;

		const onMove = (e: PointerEvent): void => {
			this.layout.moveGroup(groupId, startX + (e.clientX - startClientX), startY + (e.clientY - startClientY));
			const point = this.layout.pointerToContent(e.clientX, e.clientY);
			this.layout.updateDragPreview(point.x, point.y, groupId);
		};

		const onUp = (): void => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
			this.layout.completeGroupDrag(groupId);
		};

		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	}

	/** Dragging an edge or the corner resizes the window in place. */
	public onResizeStart(event: PointerEvent, horizontal: boolean, vertical: boolean): void
	{
		event.preventDefault();
		const startClientX = event.clientX;
		const startClientY = event.clientY;
		const startWidth = this.group.width;
		const startHeight = this.group.height;
		const groupId = this.group.id;

		const onMove = (e: PointerEvent): void => {
			this.layout.resizeGroup(
				groupId,
				horizontal ? startWidth + (e.clientX - startClientX) : startWidth,
				vertical ? startHeight + (e.clientY - startClientY) : startHeight,
			);
		};

		const onUp = (): void => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
		};

		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	}

	/**
	 * A tab is both a selector and a drag handle: releasing without crossing
	 * the drag threshold selects it; dragging past the threshold detaches that
	 * panel into its own window, which can then merge or dock like any other.
	 */
	public onTabPointerDown(event: PointerEvent, panelId: string): void
	{
		event.preventDefault();
		event.stopPropagation();

		const startClientX = event.clientX;
		const startClientY = event.clientY;
		const groupId = this.group.id;
		let detached = false;

		const onMove = (e: PointerEvent): void => {
			if (!detached) {
				if (Math.abs(e.clientX - startClientX) + Math.abs(e.clientY - startClientY) < 8) return;
				detached = true;
				this.layout.floatPanel(panelId);
			}
			const point = this.layout.pointerToContent(e.clientX, e.clientY);
			this.layout.dragFloatingTo(panelId, point.x, point.y);
			this.layout.updateDragPreview(point.x, point.y, this.layout.groupIdOf(panelId));
		};

		const onUp = (): void => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
			if (detached) {
				this.layout.completeFloatDrag(panelId);
			} else {
				this.layout.selectFloatingTab(groupId, panelId);
			}
		};

		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	}

}
