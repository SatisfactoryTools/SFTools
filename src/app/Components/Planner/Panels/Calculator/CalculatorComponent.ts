import {Component, ElementRef, OnDestroy, Signal, ViewChild, computed, effect, signal, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe, NgTemplateOutlet} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {CalculatorTabsMode} from '@src/Components/Planner/Panels/Calculator/CalculatorTabsMode';
import {faBolt, faCopy, faDownload, faFileImport, faGaugeHigh, faIndustry, faListCheck, faLock, faMountain, faPlay, faRecycle, faRightFromBracket, faRightToBracket, faRotateLeft, faScroll, faSitemap, faSliders, faWandMagicSparkles, faXmark} from '@fortawesome/free-solid-svg-icons';
import {CalculationModeOption} from '@src/Components/Planner/Panels/Calculator/CalculationModeOption';
import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';
import {CalculatorTabBadgeResolver} from '@src/Components/Planner/Panels/Calculator/CalculatorTabBadgeResolver';
import {CalculatorTabStateService} from '@src/Components/Planner/Panels/Calculator/CalculatorTabStateService';
import {FolderRecalculationService} from '@src/Components/Planner/FolderRecalculationService';
import {FolderRecalculationProgress} from '@src/Components/Planner/FolderRecalculationProgress';
import {CalculatorTabDefinition} from '@src/Components/Planner/Panels/Calculator/CalculatorTabDefinition';
import {LoadFromSaveDialogComponent} from '@src/Components/Planner/Panels/Calculator/LoadFromSaveDialogComponent';
import {CalculatorByproductsTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Byproducts/CalculatorByproductsTabComponent';
import {CalculatorOptimisationTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Optimisation/CalculatorOptimisationTabComponent';
import {CalculatorOverclockingTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Overclocking/CalculatorOverclockingTabComponent';
import {CalculatorPowerTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Power/CalculatorPowerTabComponent';
import {CalculatorInputTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Input/CalculatorInputTabComponent';
import {CalculatorMachinesTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Machines/CalculatorMachinesTabComponent';
import {CalculatorProductionTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Production/CalculatorProductionTabComponent';
import {CalculatorRecipesTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Recipes/CalculatorRecipesTabComponent';
import {CalculatorResourcesTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Resources/CalculatorResourcesTabComponent';
import {CalculatorSinkTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Sink/CalculatorSinkTabComponent';
import {CalculatorSloopsTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Sloops/CalculatorSloopsTabComponent';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {NotificationService} from '@src/Model/NotificationService';
import {CalculationMode} from '@src/Model/Planner/CalculationMode';
import {Folder} from '@src/Model/Planner/Folder';
import {FolderGroupMode} from '@src/Model/Planner/FolderGroupMode';
import {Plan} from '@src/Model/Planner/Plan';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsGroup} from '@src/Model/Planner/SettingsGroup';
import {SettingsGroups} from '@src/Model/Planner/SettingsGroups';
import {ActiveShareManager} from '@src/Model/Shares/ActiveShareManager';

@Component({
	selector: 'planner-calculator',
	templateUrl: './CalculatorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		BsDropdownModule,
		DatePipe,
		NgTemplateOutlet,
		CalculatorByproductsTabComponent,
		CalculatorInputTabComponent,
		CalculatorMachinesTabComponent,
		CalculatorOptimisationTabComponent,
		CalculatorOverclockingTabComponent,
		CalculatorPowerTabComponent,
		CalculatorProductionTabComponent,
		CalculatorRecipesTabComponent,
		CalculatorResourcesTabComponent,
		CalculatorSinkTabComponent,
		CalculatorSloopsTabComponent,
		FaIconComponent,
		InfoNoteComponent,
		LoadFromSaveDialogComponent,
		TooltipDirective,
	],
	styles: [`
		.req-controls {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 8px;
			padding: 8px 10px 0;
		}
		/* Buttons keep their label on one line; the row wraps as a whole instead. */
		.req-controls .btn {
			white-space: nowrap;
		}
		.calc-tabs-wrap {
			padding: 8px 10px 0;
		}
		/* The tabs are the panel's main navigation - lifted like the other
		   controls, with the active one carrying the accent. */
		.calc-tabs {
			--bs-nav-tabs-border-color: #5d7189;
			--bs-nav-tabs-link-active-bg: #2a4661;
			--bs-nav-tabs-link-active-color: #fff;
			--bs-nav-tabs-link-active-border-color: #5d7189 #5d7189 #2a4661;
			--bs-nav-tabs-link-hover-border-color: #5d7189 #5d7189 transparent;
			gap: 2px;
		}
		.calc-tabs .nav-link {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 5px 12px;
			background: rgba(255, 255, 255, 0.04);
			border-color: #34495e #34495e transparent;
			color: #c5d0db;
			cursor: pointer;
			white-space: nowrap;
		}
		.calc-tabs .nav-link:hover {
			background: rgba(255, 255, 255, 0.08);
			color: #fff;
		}
		.calc-tabs .nav-link.active {
			font-weight: 600;
			box-shadow: inset 0 2px 0 #4c9be8;
		}
		.calc-tabs .nav-link.active fa-icon {
			color: #4c9be8;
		}
		.calc-tabs.icons .nav-link {
			padding: 5px 8px;
		}
		/* Natural-width copies of the strip, measured to pick the mode. */
		.calc-tabs.tab-measure {
			position: absolute;
			top: -9999px;
			left: 0;
			flex-wrap: nowrap;
			width: max-content;
			visibility: hidden;
			pointer-events: none;
		}
		.tab-badge {
			font-size: 0.7em;
			font-weight: 600;
			padding: 0.2em 0.45em;
			background: rgba(255, 255, 255, 0.14);
			color: #dfe6ee;
		}
		.nav-link.active .tab-badge,
		.calc-tab-select .tab-badge {
			background: rgba(76, 155, 232, 0.35);
			color: #fff;
		}
		/* Narrow panels: the section picker is the main navigation - set it
		   apart from the toolbar above and make it read as the current place. */
		.calc-tabs-wrap.menu {
			margin-top: 6px;
			padding-top: 8px;
			border-top: 1px solid rgba(255, 255, 255, 0.08);
		}
		.calc-tab-select {
			background: #2a4661;
			border-color: #5d7189;
			color: #fff;
			font-weight: 600;
			padding: 0.45rem 0.75rem;
		}
		.calc-tab-select:hover,
		.calc-tab-select:focus {
			background: #33526f;
			border-color: #7a90a8;
			color: #fff;
		}
		.calc-tab-select .tab-select-icon {
			color: #4c9be8;
		}
	`],
})
export class CalculatorComponent implements OnDestroy
{

	/**
	 * Tab strip mode, decided from real measurements: invisible copies of the
	 * full and the icon strip report their natural widths, and the widest
	 * one that fits the panel wins (subject to the tab-labels setting).
	 */
	private tabsResizeObserver: ResizeObserver | null = null;
	private tabsWrapElement: HTMLElement | null = null;
	private measureFullElement: HTMLElement | null = null;
	private measureIconsElement: HTMLElement | null = null;
	private readonly tabsModeSignal = signal<CalculatorTabsMode>('full');
	public readonly tabsMode: Signal<CalculatorTabsMode> = this.tabsModeSignal.asReadonly();

	public readonly faCopy = faCopy;
	public readonly faDownload = faDownload;
	public readonly faFileImport = faFileImport;
	public readonly faLock = faLock;
	public readonly faSliders = faSliders;
	public readonly faPlay = faPlay;
	public readonly faRotateLeft = faRotateLeft;
	public readonly faSitemap = faSitemap;
	public readonly faXmark = faXmark;

	public readonly activeTab: Signal<CalculatorTab>;

	/** Badge text per tab (null = none), or an empty map while the setting is off. */
	public readonly badges: Signal<ReadonlyMap<CalculatorTab, string | null>>;

	public readonly tabs: CalculatorTabDefinition[] = [
		{id: 'request', label: 'Request', icon: faListCheck},
		{id: 'resources', label: 'Resources', icon: faMountain},
		{id: 'recipes', label: 'Recipes', icon: faScroll},
		{id: 'machines', label: 'Machines', icon: faIndustry},
		{id: 'input', label: 'Input', icon: faRightToBracket},
		{id: 'byproducts', label: 'Byproducts', icon: faRightFromBracket},
		{id: 'power', label: 'Power', icon: faBolt},
		{id: 'sink', label: 'Sink', icon: faRecycle},
		{id: 'sloops', label: 'Sloops', icon: faWandMagicSparkles},
		{id: 'overclocking', label: 'Overclocking', icon: faGaugeHigh},
		{id: 'optimisation', label: 'Optimisation', icon: faSliders},
	];

	public readonly modeOptions: CalculationModeOption[] = [
		{mode: 'automatic', label: 'Automatic', description: 'Recalculates as the request changes'},
		{mode: 'manual-fresh', label: 'Manual (fresh)', description: 'Replaces the current graph'},
		{mode: 'manual-upgrade', label: 'Manual (upgrade)', description: 'Merges into the current graph, summing matching nodes'},
		{mode: 'manual-append', label: 'Manual (append)', description: 'Adds beside the current graph without merging'},
	];

	public readonly activePlan: Signal<Plan | null>;
	public readonly activeFolder: Signal<Folder | null>;
	public readonly mode: Signal<CalculationMode>;
	public readonly graphDirty: Signal<boolean>;
	public readonly buttonLabel: Signal<string>;
	public readonly hasGraph: Signal<boolean>;

	/** Custom settings enabled on the active folder - its tabs are editable. */
	public readonly folderHasCustomSettings: Signal<boolean>;

	/** Display name of whatever the active plan/folder would inherit settings from. */
	public readonly parentLabel: Signal<string>;

	public readonly modeLabel: Signal<string>;

	/** The folder fixing settings groups for the active plan, or null. */
	public readonly fixedFolder: Signal<Folder | null>;

	/** Settings groups the active plan cannot edit - fixed by fixedFolder. */
	public readonly fixedGroups: Signal<readonly SettingsGroup[]>;

	/** Every group is fixed - the plan-level Reset / Inherit / Load buttons would change nothing. */
	public readonly allGroupsFixed: Signal<boolean>;

	/** Why the active folder cannot get custom settings (an ancestor fixes them), or null. */
	public readonly customSettingsBlocker: Signal<string | null>;

	/** Why the active folder cannot fix groups (a nested folder has custom settings), or null. */
	public readonly fixGroupsBlocker: Signal<string | null>;

	/** Plans inside the active folder, tree order - the recalculation order. */
	public readonly innerPlans: Signal<Plan[]>;

	public readonly outdatedPlans: Signal<Plan[]>;

	/** Outdated plans the batch skips: manual mode or a hand-modified graph. */
	public readonly skippedOutdatedPlans: Signal<Plan[]>;

	public readonly recalculationProgress: Signal<FolderRecalculationProgress | null>;

	/** The "Load settings from save" dialog's target, or null when closed. */
	private readonly loadFromSaveSignal = signal<{name: string; baseSettings: PlanSettings} | null>(null);
	public readonly loadFromSave = this.loadFromSaveSignal.asReadonly();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly planNames: PlanNameResolver,
		private readonly notifications: NotificationService,
		public readonly actions: PlannerActionsService,
		public readonly activeShare: ActiveShareManager,
		private readonly folderRecalculation: FolderRecalculationService,
		private readonly tabState: CalculatorTabStateService,
		private readonly badgeResolver: CalculatorTabBadgeResolver,
		private readonly versionManager: VersionManager,
		private readonly settingsManager: SettingsManager,
	)
	{
		this.activeTab = tabState.activeTab;
		// The preference is read inside updateTabsMode; a change must re-run it
		// even when nothing resized.
		effect(() => {
			this.settingsManager.planner().tabLabels;
			this.updateTabsMode();
		});
		this.badges = computed(() => {
			const badges = new Map<CalculatorTab, string | null>();
			if (!this.settingsManager.planner().tabBadges) {
				return badges;
			}
			const plan = this.planManager.activePlan();
			const settings = this.planManager.activeSettings();
			const data = this.versionManager.activeVersionData();
			this.tabs.forEach(tab => badges.set(tab.id, this.badgeResolver.badge(tab.id, plan, settings, data)));
			return badges;
		});
		this.fixedFolder = computed(() => {
			const plan = planManager.activePlan();
			return plan && !planManager.activePlanShared() ? planManager.fixedFolderOf(plan) : null;
		});
		this.fixedGroups = computed(() => this.fixedFolder()?.fixedGroups ?? []);
		this.allGroupsFixed = computed(() => SettingsGroups.all.every(group => this.fixedGroups().includes(group)));
		this.customSettingsBlocker = computed(() => {
			const folder = planManager.activeFolder();
			return folder ? planManager.customSettingsBlocker(folder.id) : null;
		});
		this.fixGroupsBlocker = computed(() => {
			const folder = planManager.activeFolder();
			return folder ? planManager.fixGroupsBlocker(folder.id) : null;
		});
		this.innerPlans = computed(() => {
			const folder = planManager.activeFolder();
			return folder ? planManager.innerPlans(folder.id) : [];
		});
		this.outdatedPlans = computed(() => {
			const folder = planManager.activeFolder();
			return folder ? folderRecalculation.outdatedPlans(folder.id) : [];
		});
		this.skippedOutdatedPlans = computed(() => {
			const folder = planManager.activeFolder();
			return folder ? folderRecalculation.skippedOutdatedPlans(folder.id) : [];
		});
		this.recalculationProgress = folderRecalculation.progress;

		this.activePlan = planManager.activePlan;
		this.activeFolder = planManager.activeFolder;
		this.graphDirty = planManager.activePlanGraphDirty;
		// Plans saved before calculation modes existed have no mode - treat them as automatic.
		this.mode = computed(() => this.planManager.activeSettings()?.calculationMode ?? 'automatic');
		this.modeLabel = computed(() =>
			this.modeOptions.find(option => option.mode === this.mode())?.label ?? 'Automatic');
		this.buttonLabel = computed(() => {
			switch (this.mode()) {
				case 'manual-fresh': return 'Calculate';
				case 'manual-upgrade': return 'Calculate (upgrade)';
				case 'manual-append': return 'Calculate (append)';
				default: return this.graphDirty() ? 'Resume auto' : 'Automatic';
			}
		});
		this.hasGraph = computed(() => (this.activePlan()?.graph?.nodes.length ?? 0) > 0);
		this.folderHasCustomSettings = computed(() => (this.activeFolder()?.settings ?? null) !== null);
		this.parentLabel = computed(() => {
			const plan = this.activePlan();
			if (plan?.parentPlanId) {
				const parent = this.planManager.plans().find(p => p.id === plan.parentPlanId);
				if (parent) {
					return `"${parent.name}"`;
				}
			}
			const folderId = plan ? plan.folderId : this.activeFolder()?.parentId ?? null;
			const folder = this.planManager.folders().find(f => f.id === folderId);
			return folder ? `"${folder.name}"` : 'parent settings';
		});
	}

	/**
	 * The tab strip exists only while a plan or folder is selected, so the
	 * observers follow the elements as they come and go. The measuring copies
	 * are observed too: their width changes with the badges and the active tab.
	 */
	@ViewChild('tabsWrap')
	private set tabsWrap(element: ElementRef<HTMLElement> | undefined)
	{
		this.tabsWrapElement = element?.nativeElement ?? null;
		this.observeTabs();
	}

	@ViewChild('measureFull')
	private set measureFull(element: ElementRef<HTMLElement> | undefined)
	{
		this.measureFullElement = element?.nativeElement ?? null;
		this.observeTabs();
	}

	@ViewChild('measureIcons')
	private set measureIcons(element: ElementRef<HTMLElement> | undefined)
	{
		this.measureIconsElement = element?.nativeElement ?? null;
		this.observeTabs();
	}

	public ngOnDestroy(): void
	{
		this.tabsResizeObserver?.disconnect();
	}

	private observeTabs(): void
	{
		this.tabsResizeObserver?.disconnect();
		this.tabsResizeObserver = null;
		const elements = [this.tabsWrapElement, this.measureFullElement, this.measureIconsElement];
		if (elements.some(element => element === null) || typeof ResizeObserver === 'undefined') {
			return;
		}
		this.tabsResizeObserver = new ResizeObserver(() => this.updateTabsMode());
		elements.forEach(element => this.tabsResizeObserver?.observe(element as HTMLElement));
		this.updateTabsMode();
	}

	private updateTabsMode(): void
	{
		const wrap = this.tabsWrapElement;
		const full = this.measureFullElement;
		const icons = this.measureIconsElement;
		if (!wrap || !full || !icons) {
			return;
		}
		// The strips lay out inside the wrap's padding; a couple of pixels of
		// slack keep sub-pixel rounding from wrapping the last tab.
		const style = getComputedStyle(wrap);
		const available = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2;
		const preference = this.settingsManager.planner().tabLabels;
		// Where not even the icon strip fits (phones, slim docked panels) every
		// preference ends in the dropdown - labels wrapped over four rows help no one.
		if (icons.scrollWidth > available) {
			this.tabsModeSignal.set('menu');
			return;
		}
		if (preference === 'labels' || (preference === 'auto' && full.scrollWidth <= available)) {
			this.tabsModeSignal.set('full');
			return;
		}
		this.tabsModeSignal.set('icons');
	}

	public get activeTabDefinition(): CalculatorTabDefinition
	{
		return this.tabs.find(tab => tab.id === this.activeTab()) ?? this.tabs[0];
	}

	public setTab(tab: CalculatorTab): void
	{
		this.tabState.setActiveTab(tab);
	}

	/** The "move" of the open share into the viewer's own plans (see ActiveShareManager). */
	public addShareToMyPlans(): void
	{
		this.activeShare.addToMyPlans();
	}

	public relayout(): void
	{
		this.actions.requestRelayout();
	}

	public setMode(mode: CalculationMode): void
	{
		const settings = this.planManager.activeSettings();
		if (settings) {
			this.planManager.updateActiveSettings({...settings, calculationMode: mode});
		}
	}

	public calculate(): void
	{
		const plan = this.activePlan();
		if (!plan) return;
		// The dirty flag is cleared by the solve completing, not here - a
		// failed or cancelled solve keeps the plan paused, and undo snapshots
		// taken before the solve keep the correct dirty state.
		if (this.graphDirty() && !this.actions.confirmGraphOverwrite()) {
			return;
		}
		this.actions.requestCalculate();
	}

	public cancel(): void
	{
		this.actions.requestCancel();
	}

	public resetSettings(): void
	{
		if (!confirm('Reset all solver settings (mode, recipes, resources, power) to the defaults?')) {
			return;
		}
		this.planManager.updateActiveSettings(this.planManager.defaultSettings());
	}

	public inheritSettings(): void
	{
		if (!confirm(`Replace all solver settings with those of ${this.parentLabel()}?`)) {
			return;
		}
		this.planManager.updateActiveSettings(this.parentSettings());
	}

	/** Turns on custom settings, starting from what the folder currently inherits. */
	public enableFolderSettings(): void
	{
		const folder = this.activeFolder();
		if (folder && this.customSettingsBlocker() === null) {
			this.planManager.setFolderSettings(folder.id, this.planManager.effectiveFolderSettings(folder.id));
		}
	}

	public disableFolderSettings(): void
	{
		const folder = this.activeFolder();
		if (!folder || !confirm('Remove this folder\'s custom settings? It will inherit from its parent again.')) {
			return;
		}
		this.planManager.setFolderSettings(folder.id, null);
	}

	// ── Load settings from a save file ──────────────────────────────────────

	public openLoadFromSave(): void
	{
		const plan = this.activePlan();
		const folder = this.activeFolder();
		if (plan) {
			this.loadFromSaveSignal.set({
				name: this.planNames.displayName(plan),
				baseSettings: this.planManager.cloneSettings(plan.settings),
			});
		} else if (folder) {
			// effectiveFolderSettings covers a folder still inheriting - applying
			// the save then gives it custom settings based on the inherited ones.
			this.loadFromSaveSignal.set({
				name: folder.name,
				baseSettings: this.planManager.effectiveFolderSettings(folder.id),
			});
		}
	}

	public onLoadFromSaveApply(settings: PlanSettings): void
	{
		const target = this.loadFromSaveSignal();
		const plan = this.activePlan();
		const folder = this.activeFolder();
		if (target) {
			if (plan) {
				this.planManager.updateActiveSettings(settings);
			} else if (folder) {
				this.planManager.setFolderSettings(folder.id, settings);
			}
			this.notifications.showSuccess(`Loaded settings from the save file into "${target.name}".`);
		}
		this.loadFromSaveSignal.set(null);
	}

	public closeLoadFromSave(): void
	{
		this.loadFromSaveSignal.set(null);
	}

	// ── Fixed settings groups ───────────────────────────────────────────────

	/** Whether the tab shows a settings group (request and input are per plan by nature). */
	public isGroupTab(tab: CalculatorTab): tab is SettingsGroup
	{
		return (SettingsGroups.all as readonly string[]).includes(tab);
	}

	public isFixedTab(tab: CalculatorTab): boolean
	{
		return this.isGroupTab(tab) && this.fixedGroups().includes(tab);
	}

	public groupLabel(group: SettingsGroup): string
	{
		return SettingsGroups.labelOf(group);
	}

	/**
	 * One tooltip per tab: the label when only the icon shows, plus the lock
	 * note for a fixed group (the tab content explains the details).
	 */
	public tabTooltip(tab: CalculatorTabDefinition, locks: boolean): string
	{
		const parts: string[] = [];
		if (this.tabsMode() === 'icons' && this.activeTab() !== tab.id) {
			parts.push(tab.label);
		}
		if (locks && this.isFixedTab(tab.id)) {
			parts.push(this.fixedTabTooltip(tab.id));
		}
		return parts.join(' - ');
	}

	/** Short lock note for a fixed tab: which folder fixes the group. */
	public fixedTabTooltip(tab: CalculatorTab): string
	{
		const folder = this.fixedFolder();
		if (!folder || !this.isGroupTab(tab)) {
			return '';
		}
		const pool = tab === 'resources' && folder.resourcePool ? ' (shared pool)' : '';
		return `Locked by folder "${folder.name}"${pool}`;
	}

	public groupMode(group: SettingsGroup): FolderGroupMode
	{
		const folder = this.activeFolder();
		return folder ? this.planManager.folderGroupMode(folder, group) : 'default';
	}

	/** Fixing a group with plans inside overwrites their values - confirmed once here. */
	public setGroupMode(group: SettingsGroup, mode: FolderGroupMode): void
	{
		const folder = this.activeFolder();
		if (!folder || this.groupMode(group) === mode) {
			return;
		}
		if (mode !== 'default' && this.fixGroupsBlocker() !== null) {
			return;
		}
		if (this.groupMode(group) === 'default') {
			const count = this.innerPlans().length;
			if (count > 0 && !confirm(`Apply the folder's ${this.groupLabel(group)} settings to the ${count} plan${count === 1 ? '' : 's'} inside "${folder.name}"? `
				+ `Their own ${this.groupLabel(group)} settings are overwritten.`)) {
				return;
			}
		}
		this.planManager.setFolderGroupMode(folder.id, group, mode);
	}

	/** Fixed groups of the active folder, as "Recipes, Resources (shared pool)". */
	public fixedGroupsSummary(): string
	{
		const folder = this.activeFolder();
		if (!folder) {
			return '';
		}
		return folder.fixedGroups
			.map(group => group === 'resources' && folder.resourcePool ? 'Resources (shared pool)' : this.groupLabel(group))
			.join(', ');
	}

	public openFixedFolder(): void
	{
		const folder = this.fixedFolder();
		if (folder) {
			this.planManager.setActiveFolder(folder.id);
		}
	}

	public recalculateFolder(): void
	{
		const folder = this.activeFolder();
		if (folder) {
			void this.folderRecalculation.run(folder.id);
		}
	}

	public cancelFolderRecalculation(): void
	{
		this.folderRecalculation.cancel();
	}

	public createPlanInFolder(): void
	{
		const folder = this.activeFolder();
		if (folder) {
			const plan = this.planManager.createPlan('', folder.id);
			this.planManager.setActivePlan(plan.id);
		}
	}

	/** What the active plan/folder would inherit: parent plan, else the folder chain. */
	private parentSettings(): PlanSettings
	{
		const plan = this.activePlan();
		if (plan?.parentPlanId) {
			const parent = this.planManager.plans().find(p => p.id === plan.parentPlanId);
			if (parent) {
				return this.planManager.cloneSettings(parent.settings);
			}
		}
		const folderId = plan ? plan.folderId : this.activeFolder()?.parentId ?? null;
		return this.planManager.effectiveFolderSettings(folderId);
	}

}
