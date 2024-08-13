import {AfterViewInit, Component, computed, ElementRef, HostListener, signal, ChangeDetectionStrategy} from '@angular/core';
import {NgComponentOutlet} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {faBars, faChevronDown, faChevronUp} from '@fortawesome/free-solid-svg-icons';
import {FloatingGroup} from '@src/Components/Planner/Panel/FloatingGroup';
import {PanelContentAreaComponent} from '@src/Components/Planner/Panel/PanelContentAreaComponent';
import {MOBILE_NAV_HEIGHT, PanelLayoutService, RAIL_WIDTH, STATUS_BAR_HEIGHT} from '@src/Components/Planner/Panel/PanelLayoutService';
import {PanelSide} from '@src/Components/Planner/Panel/PanelSide';
import {PlannerFloatingWindowComponent} from '@src/Components/Planner/Panel/PlannerFloatingWindowComponent';
import {PlannerRailComponent} from '@src/Components/Planner/Panel/PlannerRailComponent';
import {PlannerStatusBarComponent} from '@src/Components/Planner/StatusBar/PlannerStatusBarComponent';
import {PlannerZoomControlsComponent} from '@src/Components/Planner/ZoomControls/PlannerZoomControlsComponent';

const RAIL = RAIL_WIDTH;
const STATUS = STATUS_BAR_HEIGHT;
const MOBILE_NAV = MOBILE_NAV_HEIGHT;
const MOBILE_BREAKPOINT = 768; // px - below this width the mobile layout activates

@Component({
	selector: 'planner-panel-container',
	templateUrl: './PlannerPanelContainerComponent.html',
	imports: [
		FaIconComponent,
		NgComponentOutlet,
		TooltipDirective,
		PanelContentAreaComponent,
		PlannerFloatingWindowComponent,
		PlannerRailComponent,
		PlannerStatusBarComponent,
		PlannerZoomControlsComponent,
	],
	host: {style: 'position: absolute; inset: 0; pointer-events: none;'},
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		.fw-merge {
			outline: 2px dashed rgba(100,150,255,0.8);
			outline-offset: 2px;
			border-radius: 8px;
		}
		.rail {
			position: absolute;
			left: 0; top: 0; bottom: 0;
			width: ${RAIL}px;
			background: #10141d;
			border-right: 1px solid #222b3e;
			pointer-events: auto;
			z-index: 10;
		}

		/* ── Mobile (F1) ── */
		.mob-nav {
			position: absolute;
			left: 0; right: 0; bottom: 0;
			height: ${MOBILE_NAV}px;
			display: flex;
			background: #10141d;
			border-top: 1px solid #222b3e;
			pointer-events: auto;
			z-index: 12;
		}
		.mob-tab {
			flex: 1;
			border: none;
			background: transparent;
			color: #8899bb;
			font-size: 1rem;
			cursor: pointer;
		}
		.mob-tab.active { color: #fff; box-shadow: inset 0 2px 0 rgba(100,150,255,0.7); }
		.mob-menu-btn {
			position: absolute;
			top: 10px; left: 10px;
			width: 36px; height: 36px;
			border: 1px solid #222b3e;
			border-radius: 6px;
			background: #10141d;
			color: #ccd6ee;
			font-size: 16px;
			cursor: pointer;
			pointer-events: auto;
			z-index: 11;
		}
		.mob-view {
			position: absolute;
			left: 0; right: 0; top: 0; bottom: ${MOBILE_NAV}px;
			background: #141824;
			overflow-y: auto;
			pointer-events: auto;
			z-index: 9;
		}
		.mob-sheet {
			position: absolute;
			left: 0; right: 0; bottom: ${MOBILE_NAV}px;
			background: #141824;
			border-top: 1px solid #222b3e;
			border-radius: 12px 12px 0 0;
			pointer-events: auto;
			z-index: 10;
			display: flex;
			flex-direction: column;
		}
		.mob-sheet.expanded { height: 62%; }
		.mob-sheet-head { flex: none; cursor: pointer; user-select: none; }
		.mob-grab {
			width: 36px; height: 4px;
			border-radius: 2px;
			background: #2c3650;
			margin: 6px auto 0;
		}
		.mob-sheet-title {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 6px 14px 8px;
			font-size: 1rem;
			font-weight: 600;
			color: #ccd6ee;
		}
		.mob-sheet-caret { color: #8899bb; }
		.mob-sheet-body { flex: 1; overflow-y: auto; }
		.mob-scrim {
			position: absolute;
			inset: 0;
			background: rgba(0,0,0,0.55);
			pointer-events: auto;
			z-index: 14;
		}
		.mob-drawer {
			position: absolute;
			left: 0; top: 0; bottom: 0;
			width: 78%;
			max-width: 320px;
			background: #141824;
			border-right: 1px solid #222b3e;
			overflow-y: auto;
			pointer-events: auto;
			z-index: 15;
		}
	`],
})
export class PlannerPanelContainerComponent implements AfterViewInit
{

	public readonly faBars = faBars;
	public readonly faChevronDown = faChevronDown;
	public readonly faChevronUp = faChevronUp;

	private readonly isMobileSignal = signal(false);
	public readonly isMobile = this.isMobileSignal.asReadonly();

	private readonly drawerOpenSignal = signal(false);
	public readonly drawerOpen = this.drawerOpenSignal.asReadonly();

	private readonly sheetOpenSignal = signal(false);
	public readonly sheetOpen = this.sheetOpenSignal.asReadonly();

	public constructor(
		public readonly layout: PanelLayoutService,
		private readonly elementRef: ElementRef<HTMLElement>,
	)
	{
	}

	public ngAfterViewInit(): void
	{
		this.measureAndUpdate();
	}

	@HostListener('window:resize')
	public onWindowResize(): void
	{
		this.measureAndUpdate();
	}

	private measureAndUpdate(): void
	{
		const el = this.elementRef.nativeElement;
		const mobile = el.clientWidth < MOBILE_BREAKPOINT;
		this.isMobileSignal.set(mobile);
		this.layout.setMobile(mobile);
		if (!mobile) {
			const rect = el.getBoundingClientRect();
			this.layout.updateAvailableSpace(
				el.clientWidth - RAIL,
				el.clientHeight - STATUS,
				rect.left + RAIL,
				rect.top,
			);
		}
	}

	// ── Mobile ───────────────────────────────────────────────────────────────

	public openDrawer(): void
	{
		this.drawerOpenSignal.set(true);
	}

	public closeDrawer(): void
	{
		this.drawerOpenSignal.set(false);
	}

	public toggleSheet(): void
	{
		this.sheetOpenSignal.update(open => !open);
	}

	// ── Desktop computed styles ──────────────────────────────────────────────

	public readonly leftOpen  = computed(() => this.layout.activeLeft()  !== null);
	public readonly rightOpen = computed(() => this.layout.activeRight() !== null);
	public readonly topOpen   = computed(() => this.layout.activeTop()   !== null);

	public get leftPanelStyle(): string
	{
		const w = this.layout.sizes().left;
		return `position:absolute;left:${RAIL}px;top:0;bottom:0;width:${w}px;pointer-events:auto;z-index:9;`;
	}

	public get rightPanelStyle(): string
	{
		const w = this.layout.sizes().right;
		return `position:absolute;right:0;top:0;bottom:0;width:${w}px;pointer-events:auto;z-index:9;`;
	}

	public get topPanelStyle(): string
	{
		const sizes = this.layout.sizes();
		const l = RAIL + (this.leftOpen() ? sizes.left : 0);
		const r = this.rightOpen() ? sizes.right : 0;
		return `position:absolute;left:${l}px;right:${r}px;top:0;height:${sizes.top}px;pointer-events:auto;z-index:8;`;
	}

	public get statusBarStyle(): string
	{
		const sizes = this.layout.sizes();
		const l = RAIL + (this.leftOpen() ? sizes.left : 0);
		const r = this.rightOpen() ? sizes.right : 0;
		return `position:absolute;left:${l}px;right:${r}px;bottom:0;height:${STATUS}px;pointer-events:auto;z-index:8;`;
	}

	public get zoomStyle(): string
	{
		const sizes = this.layout.sizes();
		const l = RAIL + (this.leftOpen() ? sizes.left : 0) + 12;
		return `position:absolute;left:${l}px;bottom:${STATUS + 12}px;pointer-events:auto;z-index:7;`;
	}

	public floatWrapStyle(group: FloatingGroup, stackIndex: number): string
	{
		return `position:absolute;left:${RAIL + group.x}px;top:${group.y}px;`
			+ `width:${group.width}px;height:${group.height}px;`
			+ `pointer-events:auto;z-index:${15 + stackIndex};`;
	}

	public dockPreviewStyle(side: PanelSide): string
	{
		const sizes = this.layout.sizes();
		const base = 'position:absolute;background:rgba(100,150,255,0.14);'
			+ 'border:2px dashed rgba(100,150,255,0.65);pointer-events:none;z-index:20;';
		if (side === 'left') {
			return base + `left:${RAIL}px;top:0;bottom:0;width:${sizes.left}px;`;
		}
		if (side === 'right') {
			return base + `right:0;top:0;bottom:0;width:${sizes.right}px;`;
		}
		const l = RAIL + (this.leftOpen() ? sizes.left : 0);
		const r = this.rightOpen() ? sizes.right : 0;
		return base + `left:${l}px;right:${r}px;top:0;height:${sizes.top}px;`;
	}

}
