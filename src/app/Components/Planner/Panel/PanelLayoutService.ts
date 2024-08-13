import {computed, Injectable, OnDestroy, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, skip} from 'rxjs/operators';
import {CanvasInsets} from '@src/Components/Planner/Panel/CanvasInsets';
import {FloatingGroup} from '@src/Components/Planner/Panel/FloatingGroup';
import {PanelDefinition} from '@src/Components/Planner/Panel/PanelDefinition';
import {PanelLayoutState} from '@src/Components/Planner/Panel/PanelLayoutState';
import {PanelRuntimeState} from '@src/Components/Planner/Panel/PanelRuntimeState';
import {PanelSide} from '@src/Components/Planner/Panel/PanelSide';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

const MIN_SIZE = 100;
const DOCK_ZONE = 56;
const OCCUPIED_DOCK_ZONE = 100;
const FLOAT_WIDTH = 300;
const FLOAT_HEIGHT = 340;
const FLOAT_MIN_WIDTH = 220;
const FLOAT_MIN_HEIGHT = 140;
const TAB_BAR_HEIGHT = 36;

export const RAIL_WIDTH = 40;        // px - icon-rail width (desktop)
export const STATUS_BAR_HEIGHT = 32; // px - status-bar height (desktop)
export const MOBILE_NAV_HEIGHT = 48; // px - bottom tab-bar height (mobile)

@Injectable()
export class PanelLayoutService implements OnDestroy
{

	private readonly registeredSignal = signal<PanelDefinition[]>([]);
	public readonly registered = this.registeredSignal.asReadonly();

	// Autosave starts only once the remembered layout has been applied, so the
	// default post-registration layout never overwrites the saved one.
	private readonly restoredSignal = signal(false);
	private readonly saveSubscription: Subscription;

	private readonly statesSignal = signal<Map<string, PanelRuntimeState>>(new Map());

	// Ordered tab ids per side; membership mirrors open+docked panel states.
	private readonly sideTabsSignal = signal<Record<PanelSide, string[]>>({
		left: [], right: [], top: [],
	});

	private readonly activeTabIdsSignal = signal<Record<PanelSide, string | null>>({
		left: null, right: null, top: null,
	});

	// Floating windows; array order is the stacking order (last = topmost).
	private readonly floatingGroupsSignal = signal<FloatingGroup[]>([]);
	public readonly floatingGroups = this.floatingGroupsSignal.asReadonly();

	private readonly sizesSignal = signal<Record<PanelSide, number>>({
		left: 320, right: 320, top: 340,
	});
	public readonly sizes = this.sizesSignal.asReadonly();

	private readonly dockPreviewSignal = signal<PanelSide | null>(null);
	public readonly dockPreview = this.dockPreviewSignal.asReadonly();

	private readonly mergePreviewSignal = signal<string | null>(null);
	public readonly mergePreview = this.mergePreviewSignal.asReadonly();

	// Set by PlannerPanelContainerComponent on init and every window resize.
	// Infinity until first measurement so pre-init sizes are never clamped.
	private availableWidth = Infinity;
	private availableHeight = Infinity;
	private originX = 0;
	private originY = 0;
	private groupCounter = 0;

	public readonly activeLeft = computed(() => this.activeDockedPanel('left'));
	public readonly activeRight = computed(() => this.activeDockedPanel('right'));
	public readonly activeTop = computed(() => this.activeDockedPanel('top'));

	private readonly mobileSignal = signal(false);

	/**
	 * How much of the canvas is covered by pinned chrome on each side -
	 * rail, docked panels and status bar (or the tab bar on mobile). Used
	 * to fit the graph into the actually visible area.
	 */
	public readonly canvasInsets = computed<CanvasInsets>(() => {
		if (this.mobileSignal()) {
			return {left: 0, right: 0, top: 0, bottom: MOBILE_NAV_HEIGHT};
		}
		const sizes = this.sizes();
		return {
			left: RAIL_WIDTH + (this.activeLeft() !== null ? sizes.left : 0),
			right: this.activeRight() !== null ? sizes.right : 0,
			top: this.activeTop() !== null ? sizes.top : 0,
			bottom: STATUS_BAR_HEIGHT,
		};
	});

	public constructor(private readonly settings: SettingsManager)
	{
		// Persist the layout (debounced) on every change once restored. The key
		// dedupe skips no-op emissions; skip(1) drops the just-restored snapshot.
		this.saveSubscription = toObservable(computed(() =>
			this.restoredSignal() ? JSON.stringify(this.snapshot()) : null,
		)).pipe(
			filter((key): key is string => key !== null),
			distinctUntilChanged(),
			skip(1),
			debounceTime(750),
		).subscribe(() => this.settings.updatePanels(this.snapshot()));
	}

	public ngOnDestroy(): void
	{
		this.saveSubscription.unsubscribe();
	}

	/** Called by the container component whenever the layout mode changes. */
	public setMobile(mobile: boolean): void
	{
		this.mobileSignal.set(mobile);
	}

	/** The current layout as a plain, serializable snapshot. */
	public snapshot(): PanelLayoutState
	{
		return {
			states: Object.fromEntries(this.statesSignal()),
			sideTabs: this.sideTabsSignal(),
			activeTabIds: this.activeTabIdsSignal(),
			floatingGroups: this.floatingGroupsSignal(),
			sizes: this.sizesSignal(),
		};
	}

	/**
	 * Applies a remembered layout over the registered defaults, then enables
	 * autosave. Unknown panel ids (from a removed panel) are dropped and
	 * newly-registered panels keep their defaults, so the layout self-heals.
	 * A null/invalid state just keeps the defaults. Call once, after every
	 * panel is registered.
	 */
	public applyLayout(state: PanelLayoutState | null): void
	{
		if (state && state.states && state.sideTabs && state.sizes) {
			const known = new Set(this.registeredSignal().map(p => p.id));
			const keep = (ids: string[] | undefined): string[] => (ids ?? []).filter(id => known.has(id));

			const states = new Map(this.statesSignal());
			Object.entries(state.states).forEach(([id, runtime]) => {
				if (known.has(id)) {
					states.set(id, runtime);
				}
			});
			this.statesSignal.set(states);

			const sideTabs: Record<PanelSide, string[]> = {
				left: keep(state.sideTabs.left),
				right: keep(state.sideTabs.right),
				top: keep(state.sideTabs.top),
			};
			this.sideTabsSignal.set(sideTabs);

			const activeFor = (side: PanelSide): string | null => {
				const wanted = state.activeTabIds?.[side] ?? null;
				return wanted !== null && sideTabs[side].includes(wanted) ? wanted : (sideTabs[side][0] ?? null);
			};
			this.activeTabIdsSignal.set({left: activeFor('left'), right: activeFor('right'), top: activeFor('top')});

			const groups = (state.floatingGroups ?? [])
				.map(group => ({...group, tabIds: keep(group.tabIds)}))
				.filter(group => group.tabIds.length > 0)
				.map(group => ({...group, activeTabId: group.tabIds.includes(group.activeTabId) ? group.activeTabId : group.tabIds[0]}));
			this.floatingGroupsSignal.set(groups);
			// Keep new group ids from colliding with the restored ones.
			this.groupCounter = groups.reduce((max, g) => Math.max(max, Number(g.id.replace('group-', '')) || 0), 0);

			this.sizesSignal.set({
				left: state.sizes.left ?? 320,
				right: state.sizes.right ?? 320,
				top: state.sizes.top ?? 340,
			});
		}
		this.restoredSignal.set(true);
	}

	public register(panel: PanelDefinition): void
	{
		this.registeredSignal.update(panels => [...panels, panel]);
		this.setState(panel.id, {
			side: panel.defaultSide,
			open: false,
			floating: panel.defaultFloating ?? false,
		});
		if (panel.openByDefault) {
			this.openPanel(panel.id);
		}
	}

	public isOpen(id: string): boolean
	{
		return this.statesSignal().get(id)?.open ?? false;
	}

	/**
	 * Rail-click behavior: opens the panel if closed, selects its tab if it is
	 * open but not the visible tab of its side or window, and does nothing if
	 * already visible.
	 */
	public focusPanel(id: string): void
	{
		const state = this.statesSignal().get(id);
		if (!state) return;
		if (!state.open) {
			this.openPanel(id);
			return;
		}
		if (state.floating) {
			const groupId = this.groupIdOf(id);
			if (groupId) {
				this.selectFloatingTab(groupId, id);
				this.bringToFront(groupId);
			}
		} else {
			this.selectTab(state.side, id);
		}
	}

	public openPanel(id: string): void
	{
		const state = this.statesSignal().get(id);
		if (!state || state.open) return;
		this.setState(id, {...state, open: true});
		if (state.floating) {
			this.createGroupWith(id, this.cascadePosition());
		} else {
			this.addTab(state.side, id);
			this.clampCombinedWidth();
		}
	}

	public closePanel(id: string): void
	{
		const state = this.statesSignal().get(id);
		if (!state || !state.open) return;
		this.setState(id, {...state, open: false});
		if (state.floating) {
			this.removeFromGroup(id);
		} else {
			this.removeTab(state.side, id);
		}
	}

	/** Detaches a panel into its own floating window. */
	public floatPanel(id: string): void
	{
		const state = this.statesSignal().get(id);
		if (!state) return;

		if (state.open && state.floating) {
			const group = this.groupOf(id);
			if (!group || group.tabIds.length === 1) return; // already its own window
			this.removeFromGroup(id);
			this.createGroupWith(id, {x: group.x + 24, y: group.y + 24});
			return;
		}

		if (state.open && !state.floating) {
			this.removeTab(state.side, id);
		}
		this.setState(id, {...state, floating: true, open: true});
		this.createGroupWith(id, this.cascadePosition());
	}

	public dockPanel(id: string, side: PanelSide): void
	{
		const state = this.statesSignal().get(id);
		if (!state) return;
		if (state.open && state.floating) {
			this.removeFromGroup(id);
		}
		if (state.open && !state.floating) {
			this.removeTab(state.side, id);
		}
		this.setState(id, {...state, side, floating: false, open: true});
		this.addTab(side, id);
		this.clampCombinedWidth();
	}

	/** Moves a panel into an existing floating window as its focused tab. */
	public moveIntoGroup(panelId: string, groupId: string): void
	{
		const state = this.statesSignal().get(panelId);
		if (!state) return;
		if (this.groupIdOf(panelId) === groupId) return;
		if (state.open && state.floating) {
			this.removeFromGroup(panelId);
		}
		if (state.open && !state.floating) {
			this.removeTab(state.side, panelId);
		}
		this.setState(panelId, {...state, floating: true, open: true});
		this.floatingGroupsSignal.update(groups => groups.map(g => g.id === groupId
			? {...g, tabIds: g.tabIds.includes(panelId) ? g.tabIds : [...g.tabIds, panelId], activeTabId: panelId}
			: g));
		this.bringToFront(groupId);
	}

	public selectTab(side: PanelSide, id: string): void
	{
		if (!this.sideTabsSignal()[side].includes(id)) return;
		this.activeTabIdsSignal.update(active => ({...active, [side]: id}));
	}

	/** Used when picking a tab from the overflow dropdown: it becomes the first (always visible) tab. */
	public moveTabToFront(side: PanelSide, id: string): void
	{
		this.sideTabsSignal.update(tabs => tabs[side].includes(id)
			? {...tabs, [side]: [id, ...tabs[side].filter(t => t !== id)]}
			: tabs);
	}

	public tabsFor(side: PanelSide): PanelDefinition[]
	{
		return this.defsFor(this.sideTabsSignal()[side]);
	}

	// ── Floating windows ──────────────────────────────────────────────────────

	public panelsInGroup(group: FloatingGroup): PanelDefinition[]
	{
		return this.defsFor(group.tabIds);
	}

	public groupIdOf(panelId: string): string | null
	{
		return this.groupOf(panelId)?.id ?? null;
	}

	public selectFloatingTab(groupId: string, panelId: string): void
	{
		this.floatingGroupsSignal.update(groups => groups.map(g =>
			g.id === groupId && g.tabIds.includes(panelId) ? {...g, activeTabId: panelId} : g));
	}

	/** Used when picking a tab from the overflow dropdown: it becomes the first (always visible) tab. */
	public moveFloatingTabToFront(groupId: string, panelId: string): void
	{
		this.floatingGroupsSignal.update(groups => groups.map(g =>
			g.id === groupId && g.tabIds.includes(panelId)
				? {...g, tabIds: [panelId, ...g.tabIds.filter(t => t !== panelId)]}
				: g));
	}

	public bringToFront(groupId: string): void
	{
		this.floatingGroupsSignal.update(groups => {
			const index = groups.findIndex(g => g.id === groupId);
			if (index < 0 || index === groups.length - 1) return groups;
			return [...groups.slice(0, index), ...groups.slice(index + 1), groups[index]];
		});
	}

	public moveGroup(groupId: string, x: number, y: number): void
	{
		this.floatingGroupsSignal.update(groups => groups.map(g => {
			if (g.id !== groupId) return g;
			const position = this.clampGroupPosition(x, y, g.width, g.height);
			return {...g, x: position.x, y: position.y};
		}));
	}

	public resizeGroup(groupId: string, width: number, height: number): void
	{
		this.floatingGroupsSignal.update(groups => groups.map(g => {
			if (g.id !== groupId) return g;
			const maxWidth = this.availableWidth === Infinity ? Infinity : this.availableWidth - g.x;
			const maxHeight = this.availableHeight === Infinity ? Infinity : this.availableHeight - g.y;
			return {
				...g,
				width: Math.max(FLOAT_MIN_WIDTH, Math.min(width, maxWidth)),
				height: Math.max(FLOAT_MIN_HEIGHT, Math.min(height, maxHeight)),
			};
		}));
	}

	/** Positions a dragged panel's window so its tab bar is centered under the pointer. */
	public dragFloatingTo(panelId: string, contentX: number, contentY: number): void
	{
		const group = this.groupOf(panelId);
		if (group) {
			this.moveGroup(group.id, contentX - group.width / 2, contentY - TAB_BAR_HEIGHT / 2);
		}
	}

	/** Converts viewport client coordinates to content-area coordinates. */
	public pointerToContent(clientX: number, clientY: number): {x: number; y: number}
	{
		return {x: clientX - this.originX, y: clientY - this.originY};
	}

	/**
	 * Called while dragging a panel or window: highlights another window's tab
	 * bar as a merge target, or a dock edge, whichever the pointer is over.
	 */
	public updateDragPreview(contentX: number, contentY: number, excludeGroupId: string | null): void
	{
		if (this.availableWidth === Infinity) {
			this.dockPreviewSignal.set(null);
			this.mergePreviewSignal.set(null);
			return;
		}

		const groups = this.floatingGroupsSignal();
		for (let i = groups.length - 1; i >= 0; i--) {
			const g = groups[i];
			if (g.id === excludeGroupId) continue;
			if (contentX >= g.x && contentX <= g.x + g.width
				&& contentY >= g.y && contentY <= g.y + TAB_BAR_HEIGHT) {
				this.mergePreviewSignal.set(g.id);
				this.dockPreviewSignal.set(null);
				return;
			}
		}
		this.mergePreviewSignal.set(null);

		// Dock zones. A side already showing a docked panel gets a slightly
		// wider edge strip - releasing there merges the dragged panel in as a
		// new tab - but never the whole panel, so a floating window can still
		// hover over docked panels without snapping. An empty side keeps a
		// thin edge strip for pinning a fresh panel there. Left and right claim
		// the full height (so the corners belong to them); top takes the middle.
		const leftZone = this.activeDockedPanel('left') !== null ? OCCUPIED_DOCK_ZONE : DOCK_ZONE;
		const rightZone = this.activeDockedPanel('right') !== null ? OCCUPIED_DOCK_ZONE : DOCK_ZONE;
		const topZone = this.activeDockedPanel('top') !== null ? OCCUPIED_DOCK_ZONE : DOCK_ZONE;

		let preview: PanelSide | null = null;
		if (contentX < leftZone) {
			preview = 'left';
		} else if (contentX > this.availableWidth - rightZone) {
			preview = 'right';
		} else if (contentY < topZone) {
			preview = 'top';
		}
		this.dockPreviewSignal.set(preview);
	}

	/** Called on single-panel drag release: merges, docks, or leaves floating. */
	public completeFloatDrag(panelId: string): void
	{
		const merge = this.mergePreviewSignal();
		const dock = this.dockPreviewSignal();
		this.mergePreviewSignal.set(null);
		this.dockPreviewSignal.set(null);
		if (merge) {
			this.moveIntoGroup(panelId, merge);
		} else if (dock) {
			this.dockPanel(panelId, dock);
		}
	}

	/** Called on whole-window drag release: merges or docks all its tabs. */
	public completeGroupDrag(groupId: string): void
	{
		const merge = this.mergePreviewSignal();
		const dock = this.dockPreviewSignal();
		this.mergePreviewSignal.set(null);
		this.dockPreviewSignal.set(null);

		const group = this.floatingGroupsSignal().find(g => g.id === groupId);
		if (!group) return;

		if (merge && merge !== groupId) {
			group.tabIds.forEach(id => this.moveIntoGroup(id, merge));
			this.selectFloatingTab(merge, group.activeTabId);
		} else if (dock) {
			group.tabIds.forEach(id => this.dockPanel(id, dock));
			this.selectTab(dock, group.activeTabId);
		}
	}

	public setSize(side: PanelSide, size: number): void
	{
		this.sizesSignal.update(sizes => {
			if (side === 'top') {
				return {...sizes, top: Math.max(MIN_SIZE, Math.min(size, this.availableHeight))};
			}

			const other: PanelSide = side === 'left' ? 'right' : 'left';
			const otherOpen = this.hasDocked(other);
			const maxForSide = otherOpen
				? Math.max(MIN_SIZE, this.availableWidth - sizes[other])
				: this.availableWidth;

			return {...sizes, [side]: Math.max(MIN_SIZE, Math.min(size, maxForSide))};
		});
	}

	// ── Mobile ────────────────────────────────────────────────────────────────

	private readonly mobileActivePanelIdSignal = signal<string | null>(null);
	public readonly mobileActivePanel = computed(() => {
		const id = this.mobileActivePanelIdSignal();
		if (!id) return null;
		return this.registeredSignal().find(p => p.id === id) ?? null;
	});

	public setMobilePanel(id: string | null): void
	{
		this.mobileActivePanelIdSignal.set(id);
	}

	public panelById(id: string): PanelDefinition | null
	{
		return this.registeredSignal().find(p => p.id === id) ?? null;
	}

	// ── Available-space tracking ───────────────────────────────────────────

	/** Called by the container component on init and every window resize. */
	public updateAvailableSpace(width: number, height: number, originX: number, originY: number): void
	{
		this.availableWidth = width;
		this.availableHeight = height;
		this.originX = originX;
		this.originY = originY;

		this.sizesSignal.update(sizes => {
			let {left, right, top} = sizes;

			top   = Math.max(MIN_SIZE, Math.min(top,   height));
			left  = Math.max(MIN_SIZE, Math.min(left,  width));
			right = Math.max(MIN_SIZE, Math.min(right, width));

			const leftOpen  = this.hasDocked('left');
			const rightOpen = this.hasDocked('right');
			if (leftOpen && rightOpen && left + right > width) {
				const ratio = width / (left + right);
				left  = Math.max(MIN_SIZE, Math.floor(left  * ratio));
				right = Math.max(MIN_SIZE, Math.floor(right * ratio));
			}

			return {left, right, top};
		});

		// Shrink and pull any floating window back fully on-screen after a resize.
		this.floatingGroupsSignal.update(groups => groups.map(g => {
			const groupWidth = Math.max(FLOAT_MIN_WIDTH, Math.min(g.width, width));
			const groupHeight = Math.max(FLOAT_MIN_HEIGHT, Math.min(g.height, height));
			const position = this.clampGroupPosition(g.x, g.y, groupWidth, groupHeight);
			return position.x === g.x && position.y === g.y && groupWidth === g.width && groupHeight === g.height
				? g
				: {...g, x: position.x, y: position.y, width: groupWidth, height: groupHeight};
		}));
	}

	private clampCombinedWidth(): void
	{
		if (this.availableWidth === Infinity) return;

		if (!this.hasDocked('left') || !this.hasDocked('right')) return;

		this.sizesSignal.update(sizes => {
			if (sizes.left + sizes.right <= this.availableWidth) return sizes;
			const ratio = this.availableWidth / (sizes.left + sizes.right);
			return {
				...sizes,
				left:  Math.max(MIN_SIZE, Math.floor(sizes.left  * ratio)),
				right: Math.max(MIN_SIZE, Math.floor(sizes.right * ratio)),
			};
		});
	}

	private hasDocked(side: PanelSide): boolean
	{
		return this.sideTabsSignal()[side].length > 0;
	}

	private activeDockedPanel(side: PanelSide): PanelDefinition | null
	{
		const id = this.activeTabIdsSignal()[side];
		if (!id || !this.sideTabsSignal()[side].includes(id)) return null;
		return this.registeredSignal().find(p => p.id === id) ?? null;
	}

	private addTab(side: PanelSide, id: string): void
	{
		this.sideTabsSignal.update(tabs => tabs[side].includes(id)
			? tabs
			: {...tabs, [side]: [...tabs[side], id]});
		this.activeTabIdsSignal.update(active => ({...active, [side]: id}));
	}

	private removeTab(side: PanelSide, id: string): void
	{
		this.sideTabsSignal.update(tabs => ({...tabs, [side]: tabs[side].filter(t => t !== id)}));
		this.activeTabIdsSignal.update(active => {
			if (active[side] !== id) return active;
			const remaining = this.sideTabsSignal()[side];
			return {...active, [side]: remaining.length > 0 ? remaining[remaining.length - 1] : null};
		});
	}

	private groupOf(panelId: string): FloatingGroup | null
	{
		return this.floatingGroupsSignal().find(g => g.tabIds.includes(panelId)) ?? null;
	}

	private createGroupWith(id: string, position: {x: number; y: number}): void
	{
		const definition = this.panelById(id);
		const width = definition?.defaultFloatWidth ?? FLOAT_WIDTH;
		const height = definition?.defaultFloatHeight ?? FLOAT_HEIGHT;
		const clamped = this.clampGroupPosition(position.x, position.y, width, height);
		this.groupCounter++;
		this.floatingGroupsSignal.update(groups => [...groups, {
			id: `group-${this.groupCounter}`,
			tabIds: [id],
			activeTabId: id,
			x: clamped.x,
			y: clamped.y,
			width,
			height,
		}]);
	}

	/** Keeps a floating window entirely inside the content area. */
	private clampGroupPosition(x: number, y: number, width: number, height: number): {x: number; y: number}
	{
		if (this.availableWidth === Infinity) return {x, y};
		const maxX = Math.max(0, this.availableWidth - width);
		const maxY = Math.max(0, this.availableHeight - height);
		return {
			x: Math.max(0, Math.min(x, maxX)),
			y: Math.max(0, Math.min(y, maxY)),
		};
	}

	private removeFromGroup(panelId: string): void
	{
		this.floatingGroupsSignal.update(groups => groups
			.map(g => {
				if (!g.tabIds.includes(panelId)) return g;
				const tabIds = g.tabIds.filter(t => t !== panelId);
				return {
					...g,
					tabIds,
					activeTabId: g.activeTabId === panelId && tabIds.length > 0
						? tabIds[tabIds.length - 1]
						: g.activeTabId,
				};
			})
			.filter(g => g.tabIds.length > 0));
	}

	private cascadePosition(): {x: number; y: number}
	{
		const count = this.floatingGroupsSignal().length;
		return {x: 90 + count * 30, y: 60 + count * 24};
	}

	private defsFor(ids: string[]): PanelDefinition[]
	{
		const registered = this.registeredSignal();
		return ids
			.map(id => registered.find(p => p.id === id))
			.filter((p): p is PanelDefinition => p !== undefined);
	}

	private setState(id: string, state: PanelRuntimeState): void
	{
		this.statesSignal.update(map => {
			const next = new Map(map);
			next.set(id, state);
			return next;
		});
	}

}
