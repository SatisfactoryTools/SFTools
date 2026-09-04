import {AfterViewInit, Component, computed, ElementRef, HostListener, OnDestroy, signal, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {NgComponentOutlet} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faBars, faChevronLeft, faChevronRight, faXmark} from '@fortawesome/free-solid-svg-icons';
import {FloatingGroup} from '@src/Components/Planner/Panel/FloatingGroup';
import {PanelContentAreaComponent} from '@src/Components/Planner/Panel/PanelContentAreaComponent';
import {MOBILE_NAV_HEIGHT, PanelLayoutService, RAIL_WIDTH, STATUS_BAR_HEIGHT} from '@src/Components/Planner/Panel/PanelLayoutService';
import {PanelDefinition} from '@src/Components/Planner/Panel/PanelDefinition';
import {PanelSide} from '@src/Components/Planner/Panel/PanelSide';
import {PlannerFloatingWindowComponent} from '@src/Components/Planner/Panel/PlannerFloatingWindowComponent';
import {PlannerRailComponent} from '@src/Components/Planner/Panel/PlannerRailComponent';
import {PlannerStatusBarComponent} from '@src/Components/Planner/StatusBar/PlannerStatusBarComponent';
import {PlannerZoomControlsComponent} from '@src/Components/Planner/ZoomControls/PlannerZoomControlsComponent';

const RAIL = RAIL_WIDTH;
const STATUS = STATUS_BAR_HEIGHT;
const MOBILE_NAV = MOBILE_NAV_HEIGHT;
const MOBILE_HEAD = 44; // px - title bar above a full-screen mobile panel view
const MOBILE_BREAKPOINT = 768; // px - below this width the mobile layout activates

@Component({
	selector: 'planner-panel-container',
	templateUrl: './PlannerPanelContainerComponent.html',
	imports: [
		FaIconComponent,
		NgComponentOutlet,
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

		/* ── Mobile ── */
		.mob-nav-wrap {
			position: absolute;
			left: 0; right: 0; bottom: 0;
			height: ${MOBILE_NAV}px;
			background: #10141d;
			border-top: 1px solid #222b3e;
			pointer-events: auto;
			z-index: 12;
		}
		.mob-nav {
			height: 100%;
			display: flex;
			align-items: stretch;
			overflow-x: auto;
			overflow-y: hidden;
			scrollbar-width: none;
		}
		.mob-nav::-webkit-scrollbar { display: none; }
		.mob-nav-fade {
			position: absolute;
			top: 0; bottom: 0;
			width: 36px;
			display: flex;
			align-items: center;
			color: #8899bb;
			font-size: 0.8rem;
			pointer-events: none;
		}
		.mob-nav-fade.left {
			left: 0;
			justify-content: flex-start;
			padding-left: 4px;
			background: linear-gradient(to right, #10141d 35%, rgba(16,20,29,0));
		}
		.mob-nav-fade.right {
			right: 0;
			justify-content: flex-end;
			padding-right: 4px;
			background: linear-gradient(to left, #10141d 35%, rgba(16,20,29,0));
		}
		.mob-tab {
			flex: none;
			min-width: 72px;
			padding: 0 10px;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 3px;
			border: none;
			background: transparent;
			color: #8899bb;
			font-size: 0.7rem;
			white-space: nowrap;
			cursor: pointer;
		}
		.mob-tab fa-icon { font-size: 1.05rem; }
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
		.mob-zoom {
			position: absolute;
			left: 12px;
			bottom: ${MOBILE_NAV + 12}px;
			pointer-events: auto;
			z-index: 7;
		}
		.mob-head {
			position: absolute;
			left: 0; right: 0; top: 0;
			height: ${MOBILE_HEAD}px;
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 0 8px;
			background: #10141d;
			border-bottom: 1px solid #222b3e;
			color: #ccd6ee;
			font-weight: 600;
			pointer-events: auto;
			z-index: 10;
		}
		.mob-head-btn {
			width: 32px; height: 32px;
			border: 1px solid #222b3e;
			border-radius: 6px;
			background: transparent;
			color: #ccd6ee;
			cursor: pointer;
		}
		.mob-head-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.mob-view {
			position: absolute;
			left: 0; right: 0; top: ${MOBILE_HEAD}px; bottom: ${MOBILE_NAV}px;
			background: #141824;
			overflow-y: auto;
			overflow-x: hidden;
			container-type: inline-size;
			container-name: panel;
			pointer-events: auto;
			z-index: 9;
		}
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
			overflow-x: hidden;
			container-type: inline-size;
			container-name: panel;
			pointer-events: auto;
			z-index: 15;
		}
	`],
})
export class PlannerPanelContainerComponent implements AfterViewInit, OnDestroy
{

	public readonly faBars = faBars;
	public readonly faXmark = faXmark;
	public readonly faChevronLeft = faChevronLeft;
	public readonly faChevronRight = faChevronRight;

	private readonly navCanScrollLeftSignal = signal(false);
	public readonly navCanScrollLeft = this.navCanScrollLeftSignal.asReadonly();
	private readonly navCanScrollRightSignal = signal(false);
	public readonly navCanScrollRight = this.navCanScrollRightSignal.asReadonly();
	private navResizeObserver: ResizeObserver | null = null;

	/** The bottom bar exists only in the mobile layout - the observer follows it. */
	@ViewChild('mobNav')
	private set mobNav(element: ElementRef<HTMLElement> | undefined)
	{
		this.navResizeObserver?.disconnect();
		this.navResizeObserver = null;
		this.navElement = element?.nativeElement ?? null;
		if (this.navElement && typeof ResizeObserver !== 'undefined') {
			this.navResizeObserver = new ResizeObserver(() => this.updateNavScroll());
			this.navResizeObserver.observe(this.navElement);
		}
		this.updateNavScroll();
	}

	private navElement: HTMLElement | null = null;

	private readonly isMobileSignal = signal(false);
	public readonly isMobile = this.isMobileSignal.asReadonly();

	private readonly drawerOpenSignal = signal(false);
	public readonly drawerOpen = this.drawerOpenSignal.asReadonly();

	/** Bottom-bar entries: every panel but the plan tree, which lives in the drawer. */
	public readonly mobilePanels = computed<PanelDefinition[]>(() =>
		this.layout.registered().filter(panel => panel.id !== 'plans'));

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

	public ngOnDestroy(): void
	{
		this.navResizeObserver?.disconnect();
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

	/** A tab opens its panel; tapping the active tab again closes it, showing the graph. */
	public toggleMobilePanel(id: string): void
	{
		this.layout.setMobilePanel(this.layout.mobileActivePanel()?.id === id ? null : id);
	}

	/** Which ends of the bottom bar hide more tabs (drives the fade hints). */
	public updateNavScroll(): void
	{
		const nav = this.navElement;
		if (!nav) {
			this.navCanScrollLeftSignal.set(false);
			this.navCanScrollRightSignal.set(false);
			return;
		}
		this.navCanScrollLeftSignal.set(nav.scrollLeft > 2);
		this.navCanScrollRightSignal.set(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2);
	}

	/** Picking a plan or folder in the drawer closes it; taps on controls (toggles, menus, inputs) keep it open. */
	public onDrawerClick(event: MouseEvent): void
	{
		const target = event.target instanceof Element ? event.target : null;
		if (target?.closest('.tree-row[role="button"]') && !target.closest('button, input, .tree-menu')) {
			this.closeDrawer();
		}
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
