import {Component, ElementRef, OnDestroy, Signal, ViewChild, computed, effect, signal, ChangeDetectionStrategy} from '@angular/core';
import {DatePipe, NgTemplateOutlet} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {CalculatorTabsMode} from '@src/Components/Planner/Panels/Calculator/CalculatorTabsMode';
import {faBolt, faCopy, faDownload, faFileImport, faGaugeHigh, faIndustry, faListCheck, faLock, faMountain, faPlay, faRecycle, faRightFromBracket, faRightToBracket, faRotateLeft, faScroll, faShareNodes, faSitemap, faSliders, faWandMagicSparkles, faXmark} from '@fortawesome/free-solid-svg-icons';
import {CalculationModeOption} from '@src/Components/Planner/Panels/Calculator/CalculationModeOption';
import {HelpButtonComponent} from '@src/Components/Help/HelpButtonComponent';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';
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
import {CalculatorTabHotkeys} from '@src/Components/Planner/Panels/Calculator/CalculatorTabHotkeys';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';
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
import {ShareDialogService} from '@src/Components/Planner/Share/ShareDialogService';
import {ActiveShareManager} from '@src/Model/Shares/ActiveShareManager';
import {ActivePlanLinkManager} from '@src/Model/PlanLinks/ActivePlanLinkManager';
import {AppPlatform} from '@src/Model/Desktop/AppPlatform';

@Component({
	selector: 'planner-calculator',
	templateUrl: './CalculatorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		BsDropdownModule,
		DatePipe,
		NgTemplateOutlet,
		HelpButtonComponent,
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
		AppTooltipDirective,
	],
	styles: [`
		.req-controls {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 8px;
			padding: 8px 10px 0;
		}
		.req-controls .btn {
			white-space: nowrap;
		}
		@container panel (max-width: 560px) {
			.load-save-label {
				display: none;
			}
		}
		.calc-tabs-wrap {
			padding: 8px 10px 0;
		}
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
	public readonly faShareNodes = faShareNodes;
	public readonly faXmark = faXmark;

	public readonly activeTab: Signal<CalculatorTab>;

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
		{mode: 'automatic', label: 'Automatic', description: 'Recalculates every time you change something'},
		{mode: 'manual-fresh', label: 'Manual (replace)', description: 'Replaces the current graph'},
		{mode: 'manual-upgrade', label: 'Manual (merge)', description: 'Adds to the current graph. Matching nodes are combined.'},
		{mode: 'manual-append', label: 'Manual (add)', description: 'Adds the result next to the current graph. Nothing is combined.'},
	];

	public readonly activePlan: Signal<Plan | null>;
	public readonly activePlanLocal: Signal<boolean>;
	public readonly activeFolder: Signal<Folder | null>;
	public readonly mode: Signal<CalculationMode>;
	public readonly graphDirty: Signal<boolean>;
	public readonly buttonLabel: Signal<string>;
	public readonly automaticPaused: Signal<boolean>;
	public readonly calculateHint: Signal<string>;
	public readonly hasGraph: Signal<boolean>;

	public readonly folderHasCustomSettings: Signal<boolean>;

	public readonly parentLabel: Signal<string>;

	public readonly modeLabel: Signal<string>;

	public readonly fixedFolder: Signal<Folder | null>;

	public readonly fixedGroups: Signal<readonly SettingsGroup[]>;

	public readonly allGroupsFixed: Signal<boolean>;

	public readonly customSettingsBlocker: Signal<string | null>;

	public readonly fixGroupsBlocker: Signal<string | null>;

	public readonly innerPlans: Signal<Plan[]>;

	public readonly outdatedPlans: Signal<Plan[]>;

	public readonly skippedOutdatedPlans: Signal<Plan[]>;

	public readonly recalculationProgress: Signal<FolderRecalculationProgress | null>;

	private readonly loadFromSaveSignal = signal<{name: string; baseSettings: PlanSettings} | null>(null);
	public readonly loadFromSave = this.loadFromSaveSignal.asReadonly();

	public constructor(
		private readonly planManager: PlanManager,
		public readonly planNames: PlanNameResolver,
		protected readonly platform: AppPlatform,
		private readonly notifications: NotificationService,
		public readonly actions: PlannerActionsService,
		public readonly hotkeys: HotkeyService,
		public readonly activeShare: ActiveShareManager,
		public readonly shareDialog: ShareDialogService,
		public readonly planLink: ActivePlanLinkManager,
		private readonly folderRecalculation: FolderRecalculationService,
		private readonly tabState: CalculatorTabStateService,
		private readonly badgeResolver: CalculatorTabBadgeResolver,
		private readonly versionManager: VersionManager,
		private readonly settingsManager: SettingsManager,
	)
	{
		this.activeTab = tabState.activeTab;
		// Reading the preference here re-runs updateTabsMode on a change even when nothing resized.
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
			return plan && !planManager.activePlanReadOnly() ? planManager.fixedFolderOf(plan) : null;
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
		this.activePlanLocal = planManager.activePlanLocal;
		this.activeFolder = planManager.activeFolder;
		this.graphDirty = planManager.activePlanGraphDirty;
		// Plans saved before calculation modes existed have no mode - treat them as automatic.
		this.mode = computed(() => this.planManager.activeSettings()?.calculationMode ?? 'automatic');
		this.modeLabel = computed(() =>
			this.modeOptions.find(option => option.mode === this.mode())?.label ?? 'Automatic');
		this.buttonLabel = computed(() => {
			switch (this.mode()) {
				case 'manual-fresh': return 'Calculate';
				case 'manual-upgrade': return 'Calculate (merge)';
				case 'manual-append': return 'Calculate (add)';
				default: return this.graphDirty() ? 'Back to automatic' : 'Automatic';
			}
		});
		this.hasGraph = computed(() => (this.activePlan()?.graph?.nodes.length ?? 0) > 0);
		this.automaticPaused = computed(() => this.mode() === 'automatic' && this.graphDirty());
		this.calculateHint = computed(() => this.graphDirty()
			? 'Build the graph again. Locked nodes are kept, everything else you changed by hand is lost.'
			: this.modeOptions.find(option => option.mode === this.mode())?.description ?? '');
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
			return folder ? `"${folder.name}"` : 'the defaults';
		});
	}

	/** The strip exists only while a plan or folder is selected, so the observers re-attach as the elements come and go. */
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
		// A couple of pixels of slack keep sub-pixel rounding from wrapping the last tab.
		const style = getComputedStyle(wrap);
		const available = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2;
		const preference = this.settingsManager.planner().tabLabels;
		// When not even the icon strip fits, every preference ends in the dropdown.
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

	private static readonly TAB_HELP_TOPICS: Record<CalculatorTab, HelpTopicId> = {
		request: 'request.production',
		resources: 'request.resources',
		recipes: 'request.recipes',
		machines: 'request.machines',
		input: 'request.input',
		byproducts: 'request.byproducts',
		power: 'request.power',
		sink: 'request.sink',
		sloops: 'request.sloops',
		overclocking: 'request.overclocking',
		optimisation: 'request.optimisation',
	};

	public activeTabHelpTopic(): HelpTopicId
	{
		return CalculatorComponent.TAB_HELP_TOPICS[this.activeTab()];
	}

	public get activeTabDefinition(): CalculatorTabDefinition
	{
		return this.tabs.find(tab => tab.id === this.activeTab()) ?? this.tabs[0];
	}

	public setTab(tab: CalculatorTab): void
	{
		this.tabState.setActiveTab(tab);
	}

	public addLocalPlanToMyPlans(plan: Plan): void
	{
		this.planManager.moveLocalToAccount(plan.id, 'plan');
		this.notifications.showSuccess('Moved to your plans.');
	}

	public addShareToMyPlans(): void
	{
		const share = this.activeShare.payload();
		if (share !== null) {
			this.activeShare.addToMyPlans(share.share);
		}
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
		// No confirmation: the note and tooltip explain the rebuild, and undo restores the graph.
		// The dirty flag is cleared by the solve completing, so a failed or cancelled solve stays paused.
		this.actions.requestCalculate();
	}

	public cancel(): void
	{
		this.actions.requestCancel();
	}

	public resetSettings(): void
	{
		if (!confirm('Set all settings (mode, recipes, resources, power) back to the defaults?')) {
			return;
		}
		this.planManager.updateActiveSettings(this.planManager.defaultSettings());
	}

	public inheritSettings(): void
	{
		if (!confirm(`Replace all settings with those of ${this.parentLabel()}?`)) {
			return;
		}
		this.planManager.updateActiveSettings(this.parentSettings());
	}

	public enableFolderSettings(): void
	{
		const folder = this.activeFolder();
		if (folder) {
			this.planManager.enableFolderSettings(folder.id);
		}
	}

	public disableFolderSettings(): void
	{
		const folder = this.activeFolder();
		if (!folder || !confirm('Remove this folder\'s own settings? It will use the settings of its parent again.')) {
			return;
		}
		this.planManager.setFolderSettings(folder.id, null);
	}

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
			// effectiveFolderSettings covers a folder still inheriting; applying the save then gives it custom settings.
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

	/** The name is repeated even when the tab shows it: the tooltip is what carries the tab's hotkey. */
	public tabTooltip(tab: CalculatorTabDefinition, locks: boolean): string
	{
		const parts: string[] = [tab.label + this.hotkeys.suffix(CalculatorTabHotkeys.actionFor(tab.id))];
		if (locks && this.isFixedTab(tab.id)) {
			parts.push(this.fixedTabTooltip(tab.id));
		}
		return parts.join(' - ');
	}

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
