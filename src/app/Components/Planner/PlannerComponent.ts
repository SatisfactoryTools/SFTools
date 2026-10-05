import {AfterViewInit, Component, computed, effect, ElementRef, HostListener, OnDestroy, signal, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {faBolt, faBook, faChartPie, faCircleQuestion, faCoins, faCrosshairs, faCubes, faFolderTree, faGear, faListCheck} from '@fortawesome/free-solid-svg-icons';
import {combineLatest, debounceTime, distinctUntilChanged, filter, finalize, pairwise, skip, Subscription} from 'rxjs';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {PanelCodexNavigation} from '@src/Components/Codex/PanelCodexNavigation';
import {AddNodeDialogComponent} from '@src/Components/Planner/AddNode/AddNodeDialogComponent';
import {AddNodeFilter} from '@src/Components/Planner/AddNode/AddNodeFilter';
import {BlankContextMenu} from '@src/Components/Planner/ContextMenu/BlankContextMenu';
import {EdgeAmountAction} from '@src/Components/Planner/ContextMenu/EdgeAmountAction';
import {EdgeContextMenu} from '@src/Components/Planner/ContextMenu/EdgeContextMenu';
import {EdgeShortageMenu} from '@src/Components/Planner/ContextMenu/EdgeShortageMenu';
import {MultiNodeContextMenu} from '@src/Components/Planner/ContextMenu/MultiNodeContextMenu';
import {NodeContextMenu} from '@src/Components/Planner/ContextMenu/NodeContextMenu';
import {NodeResizeOptions} from '@src/Components/Planner/ContextMenu/NodeResizeOptions';
import {NodeSplitOptions} from '@src/Components/Planner/ContextMenu/NodeSplitOptions';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlannerContextMenuComponent} from '@src/Components/Planner/ContextMenu/PlannerContextMenuComponent';
import {PlannerContextMenuService} from '@src/Components/Planner/ContextMenu/PlannerContextMenuService';
import {CalculatorTabHotkeys} from '@src/Components/Planner/Panels/Calculator/CalculatorTabHotkeys';
import {CalculatorTabStateService} from '@src/Components/Planner/Panels/Calculator/CalculatorTabStateService';
import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';
import {HotkeyCatalog} from '@src/Model/Hotkeys/HotkeyCatalog';
import {HotkeyItem} from '@src/Model/Hotkeys/HotkeyItem';
import {HotkeyItemSource} from '@src/Model/Hotkeys/HotkeyItemSource';
import {HotkeyRegistration} from '@src/Model/Hotkeys/HotkeyRegistration';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';
import {PlannerNodeTooltipComponent} from '@src/Components/Planner/Tooltip/PlannerNodeTooltipComponent';
import {PlannerNodeTooltipService} from '@src/Components/Planner/Tooltip/PlannerNodeTooltipService';
import {FolderRecalculationService} from '@src/Components/Planner/FolderRecalculationService';
import {FuelDisableRequest} from '@src/Components/Planner/FuelDisableRequest';
import {GraphConnectToBlankRequest} from '@src/Components/Planner/GraphConnectToBlankRequest';
import {GraphContextMenuRequest} from '@src/Components/Planner/GraphContextMenuRequest';
import {GraphEdgeAddRequest} from '@src/Components/Planner/GraphEdgeAddRequest';
import {GraphEdgeAmountRequest} from '@src/Components/Planner/GraphEdgeAmountRequest';
import {GraphHistoryService} from '@src/Components/Planner/GraphHistoryService';
import {PreparedEdgeAdd} from '@src/Components/Planner/PreparedEdgeAdd';
import {NodeDoneRequest} from '@src/Components/Planner/NodeDoneRequest';
import {NodeLockRequest} from '@src/Components/Planner/NodeLockRequest';
import {NodeSplitRequest} from '@src/Components/Planner/NodeSplitRequest';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {PlannerPanelContainerComponent} from '@src/Components/Planner/Panel/PlannerPanelContainerComponent';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {CalculatorComponent} from '@src/Components/Planner/Panels/Calculator/CalculatorComponent';
import {PlannerCodexComponent} from '@src/Components/Planner/Panels/Codex/PlannerCodexComponent';
import {PlannerHelpComponent} from '@src/Components/Planner/Panels/Help/PlannerHelpComponent';
import {PlannerBuildCostComponent} from '@src/Components/Planner/Panels/BuildCost/PlannerBuildCostComponent';
import {PlannerInspectorComponent} from '@src/Components/Planner/Panels/Inspector/PlannerInspectorComponent';
import {PlannerItemsComponent} from '@src/Components/Planner/Panels/Items/PlannerItemsComponent';
import {PlannerOverviewComponent} from '@src/Components/Planner/Panels/Overview/PlannerOverviewComponent';
import {PlannerPlansComponent} from '@src/Components/Planner/Panels/Plans/PlannerPlansComponent';
import {PlannerPowerComponent} from '@src/Components/Planner/Panels/Power/PlannerPowerComponent';
import {PlannerSettingsComponent} from '@src/Components/Planner/Panels/Settings/PlannerSettingsComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {OldToolsImportRequestService} from '@src/Model/OldTools/OldToolsImportRequestService';
import {OldToolsShareService} from '@src/Model/OldTools/OldToolsShareService';
import {CalculationMode} from '@src/Model/Planner/CalculationMode';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphComposer} from '@src/Model/Planner/Graph/GraphComposer';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphLayoutResolver} from '@src/Model/Planner/GraphLayoutResolver';
import {GroupingModeResolver} from '@src/Model/Planner/GroupingModeResolver';
import {GraphMetrics} from '@src/Model/Planner/Graph/GraphMetrics';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';
import {GraphSnapshot} from '@src/Model/Planner/Graph/GraphSnapshot';
import {GraphEdgeBuilder} from '@src/Model/Planner/Graph/GraphEdgeBuilder';
import {GraphReconciler} from '@src/Model/Planner/Graph/GraphReconciler';
import {NodeResizer} from '@src/Model/Planner/NodeResizer';
import {NodeSplitter} from '@src/Model/Planner/NodeSplitter';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {SolverResponse} from '@src/Model/Planner/Solver/Response/SolverResponse';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';
import {SubplanBuildCountRequest} from '@src/Components/Planner/SubplanBuildCountRequest';
import {SubplanScaleRequest} from '@src/Components/Planner/SubplanScaleRequest';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlannerLocationService} from '@src/Model/Planner/PlannerLocationService';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';
import {SubplanScaler} from '@src/Model/Planner/SubplanScaler';
import {NotificationService} from '@src/Model/NotificationService';
import {ProductionSolverService} from '@src/Model/Planner/ProductionSolverService';
import {RateFormatter} from '@src/Model/RateFormatter';
import {SignInPromptService} from '@src/Model/Auth/SignInPromptService';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {ActiveShareManager} from '@src/Model/Shares/ActiveShareManager';
import {PageMetaService} from '@src/Model/Meta/PageMetaService';
import {ShareMetaResolver} from '@src/Model/Meta/ShareMetaResolver';
import {ActivePlanLinkManager} from '@src/Model/PlanLinks/ActivePlanLinkManager';
import {PlanLinkUnavailableDialogComponent} from '@src/Components/Planner/Share/PlanLinkUnavailableDialogComponent';
import {PlanShareDialogComponent} from '@src/Components/Planner/Share/PlanShareDialogComponent';
import {ShareDialogService} from '@src/Components/Planner/Share/ShareDialogService';

// Matches the reconciler's absolute warning tolerance.
const FLOW_TOLERANCE = 0.001;
const RATIO_TOLERANCE = 1e-4;

@Component({
	templateUrl: './PlannerComponent.html',
	imports: [PlannerPanelContainerComponent, PlannerContextMenuComponent, PlannerNodeTooltipComponent, AddNodeDialogComponent, PlanShareDialogComponent, PlanLinkUnavailableDialogComponent],
	providers: [
		FolderRecalculationService,
		PlannerGraphService,
		PanelLayoutService,
		PlannerActionsService,
		PlannerContextMenuService,
		PlannerNodeTooltipService,
		GraphHistoryService,
		{provide: CodexNavigation, useClass: PanelCodexNavigation},
	],
	changeDetection: ChangeDetectionStrategy.Eager,
	host: {style: 'position: fixed; top: 56px; left: 0; right: 0; bottom: 0; overflow: hidden;'},
})
export class PlannerComponent implements AfterViewInit, OnDestroy, HotkeyItemSource
{

	@ViewChild('graphContainer') private graphContainerRef!: ElementRef<HTMLElement>;

	private hotkeyRegistrations: HotkeyRegistration[] = [];

	private readonly plansHotkeyRetries = new Set<HotkeyAction>();

	private readonly subscription = new Subscription();
	private calcSubscription: Subscription | null = null;
	private renderedPlanId: string | null = null;

	/** Keeps a stale URL param (State → URL navigation is async) from re-activating the plan just left. */
	private urlAppliedPlanId: string | null = null;

	private readonly addNodePositionSignal = signal<GraphPoint | null>(null);
	public readonly addNodeOpen = computed(() => this.addNodePositionSignal() !== null);

	private readonly pendingConnectSignal = signal<GraphConnectToBlankRequest | null>(null);
	public readonly addNodeFilter = computed<AddNodeFilter | null>(() => {
		const pending = this.pendingConnectSignal();
		if (!pending) {
			return null;
		}
		return {itemClassName: pending.itemClassName, role: pending.side === 'output' ? 'consumer' : 'producer'};
	});

	private readonly addNodeSuggestedAmountSignal = signal<number | null>(null);
	public readonly addNodeSuggestedAmount = this.addNodeSuggestedAmountSignal.asReadonly();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly planSerializer: PlanSerializer,
		private readonly productionSolver: ProductionSolverService,
		private readonly graphComposer: GraphComposer,
		private readonly graphReconciler: GraphReconciler,
		private readonly nodeResizer: NodeResizer,
		private readonly nodeSplitter: NodeSplitter,
		private readonly edgeBuilder: GraphEdgeBuilder,
		private readonly plannerGraph: PlannerGraphService,
		private readonly panelLayout: PanelLayoutService,
		private readonly actions: PlannerActionsService,
		private readonly history: GraphHistoryService,
		private readonly contextMenu: PlannerContextMenuService,
		private readonly hotkeys: HotkeyService,
		private readonly calculatorTabs: CalculatorTabStateService,
		private readonly versionManager: VersionManager,
		private readonly enabledRecipes: EnabledRecipesResolver,
		private readonly graphLayout: GraphLayoutResolver,
		private readonly groupingModes: GroupingModeResolver,
		private readonly subplanResolver: SubplanIOResolver,
		private readonly subplanScaler: SubplanScaler,
		private readonly notifications: NotificationService,
		private readonly rateFormatter: RateFormatter,
		private readonly settings: SettingsManager,
		private readonly plannerLocation: PlannerLocationService,
		private readonly activeShare: ActiveShareManager,
		public readonly planLink: ActivePlanLinkManager,
		public readonly shareDialog: ShareDialogService,
		private readonly folderRecalculation: FolderRecalculationService,
		private readonly signInPrompt: SignInPromptService,
		private readonly oldToolsImports: OldToolsImportRequestService,
		private readonly oldToolsShares: OldToolsShareService,
		private readonly pageMeta: PageMetaService,
		private readonly shareMeta: ShareMetaResolver,
		private readonly route: ActivatedRoute,
		private readonly router: Router,
	)
	{
		// A plan id that isn't the user's own may be someone else's plan link; the URL → state sync prompts if it turns out to be theirs.
		const planIdParam = route.snapshot.paramMap.get('planId');
		const ownPlan = planIdParam === null || planManager.plans().some(p => p.id === planIdParam);
		if (route.snapshot.paramMap.get('shareId') === null && ownPlan) {
			signInPrompt.maybePrompt();
		}

		panelLayout.register({
			id: 'plans',
			helpTopic: 'panel.plans',
			hotkey: 'panel.plans',
			label: 'Plans',
			icon: faFolderTree,
			component: PlannerPlansComponent,
			defaultSide: 'left',
			openByDefault: true,
		});
		panelLayout.register({
			id: 'calculator',
			helpTopic: 'panel.calculator',
			hotkey: 'panel.calculator',
			label: 'Production request',
			icon: faListCheck,
			component: CalculatorComponent,
			defaultSide: 'top',
			openByDefault: true,
		});
		panelLayout.register({
			id: 'overview',
			helpTopic: 'panel.overview',
			hotkey: 'panel.overview',
			label: 'Overview',
			icon: faChartPie,
			component: PlannerOverviewComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'inspector',
			helpTopic: 'panel.inspector',
			hotkey: 'panel.inspector',
			label: 'Inspector',
			icon: faCrosshairs,
			component: PlannerInspectorComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'power',
			helpTopic: 'panel.power',
			hotkey: 'panel.power',
			label: 'Power',
			icon: faBolt,
			component: PlannerPowerComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'items',
			helpTopic: 'panel.items',
			hotkey: 'panel.items',
			label: 'Items',
			icon: faCubes,
			component: PlannerItemsComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'build-cost',
			helpTopic: 'panel.build-cost',
			hotkey: 'panel.buildCost',
			label: 'Build cost',
			icon: faCoins,
			component: PlannerBuildCostComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'settings',
			helpTopic: 'panel.settings',
			hotkey: 'panel.plannerSettings',
			label: 'Planner settings',
			icon: faGear,
			component: PlannerSettingsComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'codex',
			helpTopic: 'panel.codex',
			hotkey: 'panel.codex',
			label: 'Codex',
			icon: faBook,
			component: PlannerCodexComponent,
			defaultSide: 'right',
			defaultFloating: true,
			defaultFloatWidth: 500,
			defaultFloatHeight: 400,
		});

		panelLayout.register({
			id: 'help',
			helpTopic: 'panel.help',
			hotkey: 'panel.help',
			label: 'Help',
			icon: faCircleQuestion,
			component: PlannerHelpComponent,
			defaultSide: 'right',
			defaultFloating: true,
			defaultFloatWidth: 500,
			defaultFloatHeight: 400,
		});

		panelLayout.applyLayout(this.settings.panels());

		this.registerHotkeys();

		if (this.route.snapshot.queryParamMap.has('codex')) {
			panelLayout.focusPanel('codex');
		}
		if (this.route.snapshot.queryParamMap.has('help')) {
			panelLayout.focusPanel('help');
		}

		// Arrivals from the old Satisfactory Tools (its share links and its
		// "take my plans" button, both rewritten by LegacyUrlRedirectComponent)
		// carry the keys to import. The plans panel owns the dialog, so the
		// request is parked for it; the params leave the URL so a reload or a
		// copied link does not import the same lines again.
		this.acceptOldToolsImportLink();

		this.subscription.add(
			this.actions.calculateRequests.subscribe(() => this.calculate()),
		);

		this.subscription.add(
			this.actions.cancelRequests.subscribe(() => this.cancelCalculation()),
		);

		this.subscription.add(
			this.actions.nodeUpdateRequests.subscribe(node => this.applyNodeUpdate(node)),
		);

		this.subscription.add(
			this.actions.nodeLockRequests.subscribe(request => this.applyLockChange(request)),
		);

		this.subscription.add(
			this.actions.nodeDoneRequests.subscribe(request => this.applyDoneChange(request)),
		);

		this.subscription.add(
			this.actions.relayoutRequests.subscribe(() => void this.relayoutGraph()),
		);

		this.subscription.add(
			this.actions.nodeAddRequests.subscribe(position => this.addNodePositionSignal.set(position)),
		);

		this.subscription.add(
			this.actions.edgeAddRequests.subscribe(request => this.applyEdgeAdd(request)),
		);

		this.subscription.add(
			this.actions.connectToBlankRequests.subscribe(request => this.beginConnectToBlank(request)),
		);

		this.subscription.add(
			this.actions.edgeDeleteRequests.subscribe(edge => this.applyEdgeDelete(edge)),
		);

		this.subscription.add(
			this.actions.edgeAmountRequests.subscribe(request => this.applyEdgeAmount(request)),
		);

		this.subscription.add(
			this.actions.nodeSplitRequests.subscribe(request => this.applyNodeSplit(request)),
		);

		this.subscription.add(
			this.actions.nodeDeleteRequests.subscribe(nodeIds => this.applyNodeDelete(nodeIds)),
		);

		this.subscription.add(
			this.actions.recipeDisableRequests.subscribe(recipeClassName => this.disableRecipe(recipeClassName)),
		);

		this.subscription.add(
			this.actions.machineDisableRequests.subscribe(machineClassName => this.disableMachine(machineClassName)),
		);

		this.subscription.add(
			this.actions.byproductDisableRequests.subscribe(itemClassName => this.disableByproduct(itemClassName)),
		);

		this.subscription.add(
			this.actions.fuelDisableRequests.subscribe(request => this.disableFuel(request)),
		);

		this.subscription.add(
			this.actions.generatorDisableRequests.subscribe(generatorClassName => this.disableGenerator(generatorClassName)),
		);

		this.subscription.add(
			this.actions.productRemoveRequests.subscribe(itemClassName => this.removeProduct(itemClassName)),
		);

		this.subscription.add(
			this.actions.resourceDisableRequests.subscribe(resourceClassName => this.disableResource(resourceClassName)),
		);

		this.subscription.add(
			this.actions.inputRemoveRequests.subscribe(itemClassName => this.removeInput(itemClassName)),
		);

		this.subscription.add(
			toObservable(computed(() => {
				const planGraph = this.planManager.activePlan()?.settings.graph;
				return JSON.stringify({
					global: this.settings.graph(),
					numbers: this.settings.numbers(),
					machineColors: planGraph?.machineColors ?? {},
				});
			})).pipe(skip(1), distinctUntilChanged()).subscribe(() => this.restyleGraph()),
		);

		this.subscription.add(
			this.actions.subplanCreateRequests.subscribe(position => this.createSubplanNode(position)),
		);

		this.subscription.add(
			this.actions.subplanConvertRequests.subscribe(nodeIds => void this.convertToSubplan(nodeIds)),
		);

		this.subscription.add(
			this.actions.subplanOpenRequests.subscribe(subplanId => this.openSubplan(subplanId)),
		);

		this.subscription.add(
			this.actions.subplanScaleRequests.subscribe(request => this.applySubplanScale(request)),
		);

		this.subscription.add(
			this.actions.subplanBuildCountRequests.subscribe(request => this.applySubplanBuildCount(request)),
		);

		this.subscription.add(
			this.actions.undoRequests.subscribe(() => this.undo()),
		);

		this.subscription.add(
			this.actions.redoRequests.subscribe(() => this.redo()),
		);

		// pairwise + same-id guard: plan switches and graph saves must not trigger a solve.
		this.subscription.add(
			toObservable(computed(() => {
				const plan = this.planManager.activePlan();
				const defaults = this.settings.planDefaults();
				return plan === null ? null : {
					id: plan.id,
					mode: this.modeOf(plan),
					requestsKey: JSON.stringify({
						// powerUnit is display-only - must not re-solve.
						requests: plan.requests.map(r => ({itemClassName: r.itemClassName, ratePerMinute: r.ratePerMinute, mode: r.mode})),
						inputs: plan.inputs,
						// Without an explicit selection the plan follows the plan defaults.
						recipes: plan.settings.enabledRecipes ?? [defaults.alternateRecipes, defaults.conversionRecipes],
						machines: plan.settings.disabledMachines,
						limits: [plan.settings.resourceLimits, plan.settings.disabledResources, plan.settings.resourceWeightMode, plan.settings.resourceWeights],
						fuels: plan.settings.enabledFuels,
						byproducts: plan.settings.disabledByproducts,
						sinkable: plan.settings.sinkableItems,
						factoryPower: [plan.settings.producePowerForFactory, plan.settings.excessPowerPercent],
						extraPower: [plan.settings.geothermalGenerators, plan.settings.alienPowerAugmenters],
						optimisation: plan.settings.optimisation,
						sloops: [plan.settings.maxSloops, plan.settings.sloopAccuracy],
						clocks: [plan.settings.defaultClockSpeed, plan.settings.recipeClockSpeeds, plan.settings.machineClockSpeeds, plan.settings.generatorClockSpeeds],
						grouping: this.groupingModes.resolve(plan.settings),
					}),
				};
			})).pipe(
				pairwise(),
				filter(([previous, current]) =>
					previous !== null && current !== null
					&& current.mode === 'automatic'
					&& current.id === previous.id
					&& current.requestsKey !== previous.requestsKey),
				debounceTime(200),
			).subscribe(() => {
				const plan = this.planManager.activePlan();
				if (!plan) return;
				// A dirty graph pauses automatic mode silently - asking meant a blocking dialog on every keystroke.
				if (plan.metadata?.graphDirty ?? false) {
					return;
				}
				this.calculate();
			}),
		);

		this.subscription.add(
			this.plannerGraph.contextMenuRequests.subscribe(request => this.openContextMenu(request)),
		);

		this.subscription.add(
			this.plannerGraph.graphEditStarts.subscribe(() => {
				const plan = this.planManager.activePlan();
				if (plan && plan.id === this.renderedPlanId) {
					this.history.push(this.snapshotOf(plan));
				}
			}),
		);

		this.subscription.add(
			this.plannerGraph.graphChanges.pipe(debounceTime(500)).subscribe(() => {
				const planId = this.planManager.activePlanId();
				if (planId !== null && planId === this.renderedPlanId) {
					this.planManager.touchGraph(planId);
				}
			}),
		);

		this.subscription.add(
			combineLatest([this.route.paramMap, toObservable(this.planManager.plans)]).subscribe(([params, plans]) => {
				const planId = params.get('planId');
				if (!planId) {
					this.urlAppliedPlanId = null;
					return;
				}
				if (planId === this.urlAppliedPlanId) return;
				if (planId === this.planManager.activePlanId()) {
					this.urlAppliedPlanId = planId;
					return;
				}
				if (plans.some(p => p.id === planId)) {
					this.urlAppliedPlanId = planId;
					this.planManager.setActivePlan(planId);
					this.signInPrompt.maybePrompt();
					return;
				}
				// Must be the version-scoped flag - from a version-less page the store is "loaded" while still empty.
				if (this.planManager.loadedForActiveVersion()) {
					this.planLink.open(planId);
				}
			}),
		);

		// skip(1) keeps a shared link from being stripped on load; the local flag is in the key so moving a device plan into the account updates the URL.
		this.subscription.add(
			toObservable(computed(() => {
				const id = this.planManager.activePlanId();
				return {id, folderId: this.planManager.activeFolderId(), local: id !== null && this.planManager.isLocalPlan(id)};
			}))
				.pipe(skip(1))
				.subscribe(({id: activeId, folderId, local}) => {
					if (activeId !== null && this.planManager.isSharedPlan(activeId)) return;
					const id = local ? null : activeId;
					const inShare = this.route.snapshot.paramMap.get('shareId') !== null;
					if (inShare && id === null && folderId === null) return;
					if (!inShare && id === this.route.snapshot.paramMap.get('planId')) return;
					const version = this.versionManager.activeVersion();
					if (!version) return;
					const slug = this.versionManager.urlSlug(version);
					void this.router.navigate(
						id ? ['/', slug, 'planner', id] : ['/', slug, 'planner'],
						{queryParamsHandling: 'preserve'},
					);
				}),
		);

		for (const panel of ['codex', 'help']) {
			this.subscription.add(
				toObservable(computed(() => this.panelLayout.isOpen(panel))).pipe(skip(1)).subscribe(open => {
					if (!open && this.route.snapshot.queryParamMap.has(panel)) {
						void this.router.navigate([], {
							relativeTo: this.route,
							queryParams: {[panel]: null},
							queryParamsHandling: 'merge',
						});
					}
				}),
			);
		}

		this.subscription.add(
			this.route.paramMap.subscribe(params => {
				const version = this.versionManager.activeVersion();
				if (!version) return;
				this.plannerLocation.remember(this.versionManager.urlSlug(version), params.get('planId'));
			}),
		);

		// Also re-render when read-only state flips (moving a device plan into the account keeps it selected).
		this.subscription.add(
			toObservable(this.planManager.activePlan).pipe(skip(1)).subscribe(plan => {
				if (plan?.id === this.renderedPlanId && (plan === null || this.planManager.isReadOnlyPlan(plan.id) === this.plannerGraph.readOnly)) return;
				this.actions.setSolveError(null);
				this.renderPlan(plan);
			}),
		);

		this.subscription.add(
			this.planManager.scrubbedGraphs.subscribe(planIds => this.refreshScrubbedGraph(planIds)),
		);

		this.subscription.add(
			this.folderRecalculation.graphReplaced.subscribe(planId => this.refreshScrubbedGraph([planId])),
		);

		this.subscription.add(
			toObservable(computed(() => new Map(this.planManager.plans().map(p => [p.id, p.name]))))
				.pipe(pairwise())
				.subscribe(([previous, current]) => {
					const renamed = [...current].some(([id, name]) => previous.has(id) && previous.get(id) !== name);
					if (renamed) {
						this.refreshRenderedSubplanNodes();
					}
				}),
		);

		// paramMap emits synchronously, so share mode activates within the constructor.
		this.subscription.add(
			this.route.paramMap.subscribe(params => {
				const shareId = params.get('shareId');
				if (shareId !== null) {
					this.activeShare.open(shareId);
				} else {
					this.activeShare.close();
				}
				const planId = params.get('planId');
				if (planId === null || this.planManager.plans().some(p => p.id === planId)) {
					this.planLink.close();
				}
			}),
		);

		// An open share names the tab after the shared plan or folder; own plans keep the route's
		// "Production planner" title (their names stay private, as in link previews).
		effect(() => {
			const payload = this.activeShare.payload();
			if (payload !== null) {
				this.pageMeta.set(this.shareMeta.resolve(payload));
			}
		});
	}

	public ngAfterViewInit(): void
	{
		const plan = this.planManager.activePlan();
		if (plan) {
			this.renderPlan(plan);
		}
		this.openRequestedPanel();
	}

	/** Deferred to here: the panel container decides mobile layout only in its own ngAfterViewInit. */
	private openRequestedPanel(): void
	{
		const requested = this.route.snapshot.queryParamMap.get('panel');
		if (requested === null) {
			return;
		}
		if (this.panelLayout.panelById(requested) !== null) {
			this.panelLayout.focusPanel(requested);
		}
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams: {panel: null},
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}

	private acceptOldToolsImportLink(): void
	{
		const params = this.route.snapshot.queryParamMap;
		const importOld = params.get('importOld');
		if (importOld === null) {
			return;
		}
		this.oldToolsImports.request({
			shareKeys: importOld === 'local' ? [] : this.oldToolsShares.parseShareKeyList(importOld),
			localLines: importOld === 'local',
			otherFlavourShareKeys: this.oldToolsShares.parseShareKeyList(params.get('importOldOther')),
		});
		this.panelLayout.focusPanel('plans');
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams: {importOld: null, importOldOther: null},
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}

	public ngOnDestroy(): void
	{
		this.cancelCalculation();
		this.subscription.unsubscribe();
		this.hotkeyRegistrations.forEach(registration => registration.unregister());
		this.hotkeyRegistrations = [];
		this.activeShare.close();
		this.planLink.close();
	}

	public hotkeyItems(): HotkeyItem[]
	{
		if (this.planManager.activePlanReadOnly()) {
			return [];
		}
		const items: HotkeyItem[] = [...new BlankContextMenu(this.actions, this.plannerGraph.canvasCenter()).getItems()];
		const nodes = this.plannerGraph.selectedNodes();
		if (nodes.length === 1) {
			items.push(...new NodeContextMenu(nodes[0], this.nodeResizeOptions(nodes[0]), this.nodeSplitOptions(nodes[0]),
				this.actions, this.panelLayout, this.plannerGraph).getItems());
		} else if (nodes.length > 1) {
			items.push(...new MultiNodeContextMenu(nodes, this.actions).getItems());
		}
		return items;
	}

	private registerHotkeys(): void
	{
		this.hotkeyRegistrations.push(
			this.hotkeys.registerSource(this),
			this.hotkeys.register('planner.calculate', () => this.runIfEditable(() => this.actions.requestCalculate())),
			this.hotkeys.register('planner.rearrange', () => this.runIfEditable(() => this.actions.requestRelayout())),
			this.hotkeys.register('planner.undo', () => this.runIfEditable(() => this.undo())),
			this.hotkeys.register('planner.redo', () => this.runIfEditable(() => this.redo())),
			this.hotkeys.register('planner.zoomIn', () => this.plannerGraph.zoomIn()),
			this.hotkeys.register('planner.zoomOut', () => this.plannerGraph.zoomOut()),
			this.hotkeys.register('planner.zoomFit', () => this.plannerGraph.zoomFit()),
		);
		CalculatorTabHotkeys.ENTRIES.forEach(entry => {
			this.hotkeyRegistrations.push(this.hotkeys.register(entry.action, () => {
				this.panelLayout.focusPanel('calculator');
				this.calculatorTabs.setActiveTab(entry.tab);
			}));
		});
		this.panelLayout.registered().forEach(panel => {
			if (panel.hotkey) {
				const id = panel.id;
				this.hotkeyRegistrations.push(this.hotkeys.register(panel.hotkey, () => this.panelLayout.toggleFromRail(id)));
			}
		});
		// The Plans tree only handles these while visible, so show it and re-run the key next tick.
		HotkeyCatalog.definitionsOf('plans').forEach(definition => {
			this.hotkeyRegistrations.push(this.hotkeys.register(definition.action, () => this.openPlansPanelAndRun(definition.action)));
		});
	}

	/** Single retry, so an unanswered key doesn't bounce between here and the hotkey service. */
	private openPlansPanelAndRun(action: HotkeyAction): void
	{
		if (this.plansHotkeyRetries.has(action)) {
			return;
		}
		this.plansHotkeyRetries.add(action);
		this.panelLayout.focusPanel('plans');
		setTimeout(() => {
			this.hotkeys.run(action);
			this.plansHotkeyRetries.delete(action);
		});
	}

	private runIfEditable(action: () => void): void
	{
		if (!this.planManager.activePlanReadOnly()) {
			action();
		}
	}

	private openContextMenu(request: GraphContextMenuRequest): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		let menu: PlannerContextMenu;
		if (request.edge) {
			const amounts = this.edgeAmountActions(request.edge);
			menu = new EdgeContextMenu(request.edge, this.edgeMenuTitle(request.edge), amounts.minimise, amounts.maximise, this.actions);
		} else if (request.nodes.length === 0) {
			menu = new BlankContextMenu(this.actions, request.local);
		} else if (request.nodes.length === 1) {
			menu = new NodeContextMenu(request.nodes[0], this.nodeResizeOptions(request.nodes[0]), this.nodeSplitOptions(request.nodes[0]),
				this.actions, this.panelLayout, this.plannerGraph);
		} else {
			menu = new MultiNodeContextMenu(request.nodes, this.actions);
		}
		this.contextMenu.open(menu, request.clientX, request.clientY);
	}

	private edgeMenuTitle(edge: GraphEdge): string
	{
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(edge.itemClassName) ?? null;
		return `${item?.name ?? edge.itemClassName} - ${this.rateFormatter.rate(edge.amount, item)}`;
	}

	private reviveActiveGraph(): Graph | null
	{
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return null;
		}
		try {
			return this.planSerializer.reviveGraph(plan.graph);
		} catch {
			return null;
		}
	}

	private edgeAmountActions(edge: GraphEdge): {minimise: EdgeAmountAction | null; maximise: EdgeAmountAction | null}
	{
		const graph = this.reviveActiveGraph();
		if (!graph) {
			return {minimise: null, maximise: null};
		}
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(edge.itemClassName) ?? null;
		const provided = this.graphReconciler.spareOutput(graph, edge.sourceId, edge.itemClassName) + edge.amount;
		const needed = this.graphReconciler.remainingDemand(graph, edge.targetId, edge.itemClassName) + edge.amount;
		const lower = Math.min(provided, needed);
		const upper = Math.max(provided, needed);
		const equal = upper - lower <= FLOW_TOLERANCE;
		return {
			minimise: !equal && Math.abs(edge.amount - lower) > FLOW_TOLERANCE
				? {amount: lower, label: `Minimise (${this.rateFormatter.rate(lower, item)})`}
				: null,
			maximise: !equal && Math.abs(edge.amount - upper) > FLOW_TOLERANCE
				? {amount: upper, label: `Maximise (${this.rateFormatter.rate(upper, item)})`}
				: null,
		};
	}

	private nodeResizeOptions(node: Node): NodeResizeOptions
	{
		const none: NodeResizeOptions = {minimise: null, maximise: null};
		if (!this.nodeResizer.isResizable(node)) {
			return none;
		}
		const graph = this.reviveActiveGraph();
		if (!graph) {
			return none;
		}
		const ratios = this.nodeResizer.edgeRatios(node, graph.edges);
		if (ratios.length === 0) {
			return none;
		}
		const minRatio = Math.min(...ratios);
		const maxRatio = Math.max(...ratios);
		return {
			minimise: minRatio < 1 - RATIO_TOLERANCE ? this.nodeResizer.scaled(node, minRatio) : null,
			maximise: maxRatio > 1 + RATIO_TOLERANCE ? this.nodeResizer.scaled(node, maxRatio) : null,
		};
	}

	private nodeSplitOptions(node: Node): NodeSplitOptions
	{
		const none: NodeSplitOptions = {inputs: 1, outputs: 1, both: 1};
		if (!this.nodeSplitter.isSplittable(node)) {
			return none;
		}
		const graph = this.reviveActiveGraph();
		if (!graph) {
			return none;
		}
		return {
			inputs: this.nodeSplitter.pieceCount(graph, node.id, 'inputs'),
			outputs: this.nodeSplitter.pieceCount(graph, node.id, 'outputs'),
			both: this.nodeSplitter.pieceCount(graph, node.id, 'both'),
		};
	}

	private applyNodeSplit(request: NodeSplitRequest): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not split the node: ' + String(err));
			return;
		}

		const node = graph.nodes.find(candidate => candidate.id === request.nodeId);
		if (!node) {
			return;
		}

		const size = this.plannerGraph.nodeSize(node);
		const layout = this.graphLayout.resolve(plan.settings.graph);
		const offset: GraphPoint = layout.direction === 'down'
			? {x: size.width + layout.nodeSpacing, y: 0}
			: {x: 0, y: size.height + layout.nodeSpacing};

		const updated = this.nodeSplitter.split(graph, request.nodeId, request.mode, plan.settings, offset);
		if (!updated) {
			return;
		}

		this.history.push(this.snapshotOf(plan));

		const before = new Set(graph.nodes.map(candidate => candidate.id));
		const pieceIds = updated.nodes
			.filter(candidate => candidate.id === request.nodeId || !before.has(candidate.id))
			.map(candidate => candidate.id);
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.plannerGraph.selectNodesById(pieceIds);
		this.planManager.setGraph(plan.id, updated, true);
	}

	private applyNodeUpdate(updated: Node): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let current: Graph;
		try {
			current = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not apply node update: ' + String(err));
			return;
		}

		// Inspector edits are debounced - the node may be gone by now.
		if (!current.nodes.some(node => node.id === updated.id)) {
			return;
		}

		// Snapshot before reconcile, which mutates edge amounts in place.
		this.history.push(this.snapshotOf(plan));

		const replaced: Graph = {
			nodes: current.nodes.map(node => node.id === updated.id ? updated : node),
			edges: current.edges,
		};
		const reconciled = this.graphReconciler.reconcile(replaced, updated.id);

		// A debounced inspector edit may land after another node was selected.
		const selectedIds = this.plannerGraph.selectedNodes().map(node => node.id);
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, reconciled, false);
		this.plannerGraph.selectNodesById(selectedIds.length > 0 ? selectedIds : [updated.id]);
		this.planManager.setGraph(plan.id, reconciled, true);
	}

	private applyEdgeAdd(request: GraphEdgeAddRequest): void
	{
		const prepared = this.prepareEdgeAdd(request);
		if (!prepared) {
			return;
		}
		const deficit = prepared.demand - prepared.spare;
		if (deficit > FLOW_TOLERANCE && this.nodeResizer.increasedOutput(prepared.source, request.itemClassName, deficit) !== null) {
			this.openEdgeShortageMenu(request, prepared, deficit);
			return;
		}
		this.insertPreparedEdge(prepared, request);
	}

	private prepareEdgeAdd(request: GraphEdgeAddRequest): PreparedEdgeAdd | null
	{
		if (this.planManager.activePlanReadOnly()) {
			return null;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return null;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not connect nodes: ' + String(err));
			return null;
		}

		const duplicate = graph.edges.some(edge =>
			edge.sourceId === request.sourceId && edge.targetId === request.targetId && edge.itemClassName === request.itemClassName);
		const source = graph.nodes.find(node => node.id === request.sourceId);
		if (duplicate || !source || !graph.nodes.some(node => node.id === request.targetId)) {
			return null;
		}

		return {
			plan,
			graph,
			source,
			spare: this.graphReconciler.spareOutput(graph, request.sourceId, request.itemClassName),
			demand: this.graphReconciler.remainingDemand(graph, request.targetId, request.itemClassName),
		};
	}

	private insertPreparedEdge(prepared: PreparedEdgeAdd, request: GraphEdgeAddRequest): void
	{
		this.history.push(this.snapshotOf(prepared.plan));

		const amount = Math.min(prepared.spare, prepared.demand);
		const updated: Graph = {
			nodes: prepared.graph.nodes,
			edges: [...prepared.graph.edges, {sourceId: request.sourceId, targetId: request.targetId, itemClassName: request.itemClassName, amount}],
		};

		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.planManager.setGraph(prepared.plan.id, updated, true);
	}

	private openEdgeShortageMenu(request: GraphEdgeAddRequest, prepared: PreparedEdgeAdd, deficit: number): void
	{
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(request.itemClassName) ?? null;
		const menu = new EdgeShortageMenu(
			`${item?.name ?? request.itemClassName} - needs ${this.rateFormatter.rate(prepared.demand, item)}, ${this.rateFormatter.rate(prepared.spare, item)} free`,
			`Increase output by ${this.rateFormatter.rate(deficit, item)}`,
			`Keep output (connection gets ${this.rateFormatter.rate(prepared.spare, item)})`,
			() => this.applyEdgeAddIncreasing(request),
			() => {
				const revalidated = this.prepareEdgeAdd(request);
				if (revalidated) {
					this.insertPreparedEdge(revalidated, request);
				}
			},
		);
		this.contextMenu.open(menu, request.clientX, request.clientY);
	}

	private applyEdgeAddIncreasing(request: GraphEdgeAddRequest): void
	{
		const prepared = this.prepareEdgeAdd(request);
		if (!prepared) {
			return;
		}
		const deficit = prepared.demand - prepared.spare;
		const increased = deficit > FLOW_TOLERANCE
			? this.nodeResizer.increasedOutput(prepared.source, request.itemClassName, deficit)
			: null;
		if (!increased) {
			this.insertPreparedEdge(prepared, request);
			return;
		}

		this.history.push(this.snapshotOf(prepared.plan));

		const replaced: Graph = {
			nodes: prepared.graph.nodes.map(node => node.id === increased.id ? increased : node),
			edges: [...prepared.graph.edges, {sourceId: request.sourceId, targetId: request.targetId, itemClassName: request.itemClassName, amount: prepared.demand}],
		};
		const reconciled = this.graphReconciler.reconcile(replaced, increased.id);

		this.plannerGraph.restore(this.graphContainerRef.nativeElement, reconciled, false);
		this.planManager.setGraph(prepared.plan.id, reconciled, true);
	}

	private applyEdgeAmount(request: GraphEdgeAmountRequest): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not change the connection amount: ' + String(err));
			return;
		}

		const index = graph.edges.findIndex(candidate =>
			candidate.sourceId === request.edge.sourceId
			&& candidate.targetId === request.edge.targetId
			&& candidate.itemClassName === request.edge.itemClassName);
		if (index < 0) {
			return;
		}

		this.history.push(this.snapshotOf(plan));

		const edges = graph.edges.map((edge, i) => i === index ? {...edge, amount: request.amount} : edge);
		const updated: Graph = {
			nodes: this.withElasticEndpointsResized(graph.nodes, edges, edges[index]),
			edges,
		};

		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.planManager.setGraph(plan.id, updated, true);
	}

	private withElasticEndpointsResized(nodes: Node[], edges: GraphEdge[], changed: GraphEdge): Node[]
	{
		return nodes.map(node => {
			if (node.id === changed.sourceId && node instanceof InputNode) {
				const total = edges.filter(edge => edge.sourceId === node.id).reduce((sum, edge) => sum + edge.amount, 0);
				return this.nodeResizer.withAmount(node, total);
			}
			if (node.id === changed.targetId && node instanceof ByproductNode) {
				const total = edges.filter(edge => edge.targetId === node.id).reduce((sum, edge) => sum + edge.amount, 0);
				return this.nodeResizer.withAmount(node, total);
			}
			return node;
		});
	}

	private applyEdgeDelete(edge: GraphEdge): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not delete the connection: ' + String(err));
			return;
		}

		const remaining = graph.edges.filter(candidate =>
			candidate.sourceId !== edge.sourceId || candidate.targetId !== edge.targetId || candidate.itemClassName !== edge.itemClassName);
		if (remaining.length === graph.edges.length) {
			return;
		}

		this.history.push(this.snapshotOf(plan));

		const updated: Graph = {nodes: graph.nodes, edges: remaining};
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.planManager.setGraph(plan.id, updated, true);
	}

	/** Undo only restores the parent graph - a deleted subplan comes back as a dangling node. */
	private applyNodeDelete(nodeIds: string[]): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not delete nodes: ' + String(err));
			return;
		}

		const ids = new Set(nodeIds);
		const removed = graph.nodes.filter(node => ids.has(node.id));
		if (removed.length === 0) {
			return;
		}

		const subplans = removed.filter((node): node is SubplanNode => node instanceof SubplanNode);
		if (subplans.length > 0) {
			const names = subplans.map(node => `"${node.getDisplayName()}"`).join(', ');
			const message = subplans.length === 1
				? `Delete subplan ${names}? This also removes it from your plans.`
				: `Delete subplans ${names}? This also removes them from your plans.`;
			if (!confirm(message)) {
				return;
			}
		}

		this.history.push(this.snapshotOf(plan));

		const updated: Graph = {
			nodes: graph.nodes.filter(node => !ids.has(node.id)),
			edges: graph.edges.filter(edge => !ids.has(edge.sourceId) && !ids.has(edge.targetId)),
		};
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.planManager.setGraph(plan.id, updated, true);
		subplans.forEach(node => this.planManager.deletePlan(node.subplanId));
	}

	private beginConnectToBlank(request: GraphConnectToBlankRequest): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch {
			return;
		}
		if (!graph.nodes.some(node => node.id === request.nodeId)) {
			return;
		}

		const free = request.side === 'output'
			? this.graphReconciler.spareOutput(graph, request.nodeId, request.itemClassName)
			: this.graphReconciler.remainingDemand(graph, request.nodeId, request.itemClassName);

		this.pendingConnectSignal.set(request);
		this.addNodeSuggestedAmountSignal.set(free > 0 ? free : null);
		this.addNodePositionSignal.set(request.position);
	}

	private snapshotOf(plan: Plan): GraphSnapshot
	{
		return {
			planId: plan.id,
			graphJson: plan.graph ? JSON.stringify(plan.graph) : null,
			subplansJson: JSON.stringify(this.planManager.subplansOf(plan.id)),
		};
	}

	private undo(): void
	{
		this.restoreSnapshot(current => this.history.undo(current));
	}

	private redo(): void
	{
		this.restoreSnapshot(current => this.history.redo(current));
	}

	private restoreSnapshot(pop: (current: GraphSnapshot) => GraphSnapshot | null): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan || plan.id !== this.renderedPlanId) {
			return;
		}
		const snapshot = pop(this.snapshotOf(plan));
		if (!snapshot || snapshot.planId !== plan.id) {
			return;
		}

		// Always dirty: the restored graph may not match the current request.
		if (snapshot.graphJson === null) {
			this.plannerGraph.clear();
			this.planManager.setGraph(plan.id, null, true);
			this.restoreSubplans(plan.id, snapshot);
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(JSON.parse(snapshot.graphJson) as Graph);
		} catch (err) {
			this.notifications.show('Could not restore graph state: ' + String(err));
			return;
		}
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, graph, false);
		this.planManager.setGraph(plan.id, graph, true);
		this.restoreSubplans(plan.id, snapshot);
	}

	/** Must run after the graph restore so the redo-side delete finds the node gone and scrubs nothing. */
	private restoreSubplans(planId: string, snapshot: GraphSnapshot): void
	{
		try {
			this.planManager.reconcileSubplans(planId, JSON.parse(snapshot.subplansJson) as Plan[]);
		} catch (err) {
			this.notifications.show('Could not restore subplans: ' + String(err));
		}
	}

	private applyLockChange(request: NodeLockRequest): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not change node lock: ' + String(err));
			return;
		}

		this.history.push(this.snapshotOf(plan));

		const ids = new Set(request.nodeIds);
		graph.nodes.forEach(node => {
			if (ids.has(node.id)) {
				node.locked = request.locked;
			}
		});

		this.plannerGraph.restore(this.graphContainerRef.nativeElement, graph, false);
		if (request.nodeIds.length === 1) {
			this.plannerGraph.selectNodeById(request.nodeIds[0]);
		}
		// Not dirty: every solve keeps locked nodes, and dirty would pause automatic mode.
		this.planManager.setGraph(plan.id, graph);
	}

	/** Dirty because a recalculation drops the flags. */
	private applyDoneChange(request: NodeDoneRequest): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not change node done state: ' + String(err));
			return;
		}

		this.history.push(this.snapshotOf(plan));

		const ids = new Set(request.nodeIds);
		graph.nodes.forEach(node => {
			if (ids.has(node.id)) {
				node.done = request.done;
			}
		});

		this.plannerGraph.restore(this.graphContainerRef.nativeElement, graph, false);
		this.plannerGraph.selectNodesById(request.nodeIds);
		this.planManager.setGraph(plan.id, graph, true);
	}

	private disableRecipe(recipeClassName: string): void
	{
		const settings = this.planManager.activeSettings();
		const data = this.versionManager.activeVersionData();
		if (!settings || !data) {
			return;
		}
		const enabled = this.enabledRecipes.resolve(settings, data);
		enabled.delete(recipeClassName);
		this.planManager.updateActiveSettings({...settings, enabledRecipes: [...enabled].sort()});
	}

	private disableMachine(machineClassName: string): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) {
			return;
		}
		const disabled = new Set(settings.disabledMachines ?? []);
		disabled.add(machineClassName);
		this.planManager.updateActiveSettings({...settings, disabledMachines: [...disabled].sort()});
	}

	private disableByproduct(itemClassName: string): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) {
			return;
		}
		const disabled = new Set(settings.disabledByproducts ?? []);
		disabled.add(itemClassName);
		this.planManager.updateActiveSettings({...settings, disabledByproducts: [...disabled].sort()});
	}

	private disableFuel(request: FuelDisableRequest): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) {
			return;
		}
		const fuels = {...(settings.enabledFuels ?? {})};
		const remaining = (fuels[request.generatorClassName] ?? []).filter(fuel => fuel !== request.fuelItemClassName);
		if (remaining.length > 0) {
			fuels[request.generatorClassName] = remaining;
		} else {
			delete fuels[request.generatorClassName];
		}
		this.planManager.updateActiveSettings({...settings, enabledFuels: Object.keys(fuels).length > 0 ? fuels : undefined});
	}

	private disableGenerator(generatorClassName: string): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) {
			return;
		}
		const fuels = {...(settings.enabledFuels ?? {})};
		delete fuels[generatorClassName];
		this.planManager.updateActiveSettings({...settings, enabledFuels: Object.keys(fuels).length > 0 ? fuels : undefined});
	}

	private disableResource(resourceClassName: string): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) {
			return;
		}
		const disabled = new Set(settings.disabledResources ?? []);
		disabled.add(resourceClassName);
		this.planManager.updateActiveSettings({...settings, disabledResources: [...disabled].sort()});
	}

	private removeProduct(itemClassName: string): void
	{
		const plan = this.planManager.activePlan();
		if (!plan) {
			return;
		}
		this.planManager.setRequests(plan.id, plan.requests.filter(request => request.itemClassName !== itemClassName));
	}

	private removeInput(itemClassName: string): void
	{
		const plan = this.planManager.activePlan();
		if (!plan) {
			return;
		}
		this.planManager.setInputs(plan.id, plan.inputs.filter(input => input.itemClassName !== itemClassName));
	}

	/** Leaves the dirty flag as is, like manual node drags. */
	private async relayoutGraph(): Promise<void>
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId || this.actions.isCalculating()) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not rearrange the graph: ' + String(err));
			return;
		}
		if (graph.nodes.length === 0) {
			return;
		}

		this.history.push(this.snapshotOf(plan));

		try {
			await this.plannerGraph.layout(graph.nodes, graph.edges, plan.settings.graph);
		} catch (err) {
			this.notifications.show('Could not rearrange the graph: ' + String(err));
			return;
		}

		this.plannerGraph.restore(this.graphContainerRef.nativeElement, graph);
		this.planManager.setGraph(plan.id, graph);
	}

	private applySubplanScale(request: SubplanScaleRequest): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not resize the subplan: ' + String(err));
			return;
		}

		const node = graph.nodes.find(candidate => candidate.id === request.nodeId);
		if (!(node instanceof SubplanNode)) {
			return;
		}

		const snapshot = this.snapshotOf(plan);
		try {
			this.subplanScaler.scale(request.subplanId, request.factor);
		} catch (err) {
			this.notifications.show('Could not resize the subplan: ' + String(err));
			return;
		}
		this.history.push(snapshot);

		// A plan may place the same subplan more than once.
		const refreshed = this.refreshSubplanNodes(graph);
		const resizedIds = refreshed.nodes
			.filter((candidate): candidate is SubplanNode => candidate instanceof SubplanNode && candidate.subplanId === request.subplanId)
			.map(candidate => candidate.id);
		const reconciled = resizedIds.reduce((current, id) => this.graphReconciler.reconcile(current, id), refreshed);

		const selectedIds = this.plannerGraph.selectedNodes().map(selected => selected.id);
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, reconciled, false);
		this.plannerGraph.selectNodesById(selectedIds.length > 0 ? selectedIds : [node.id]);
		this.planManager.setGraph(plan.id, reconciled, true);
	}

	private applySubplanBuildCount(request: SubplanBuildCountRequest): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not change the subplan: ' + String(err));
			return;
		}

		const node = graph.nodes.find(candidate => candidate.id === request.nodeId);
		if (!(node instanceof SubplanNode)) {
			return;
		}
		const updated = this.subplanResolver.withBuildCount(node, request.buildCount);
		if (updated === node) {
			return;
		}

		this.history.push(this.snapshotOf(plan));

		const withNode: Graph = {
			nodes: graph.nodes.map(candidate => candidate === node ? updated : candidate),
			edges: graph.edges,
		};
		const reconciled = this.graphReconciler.reconcile(withNode, updated.id);

		const selectedIds = this.plannerGraph.selectedNodes().map(selected => selected.id);
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, reconciled, false);
		this.plannerGraph.selectNodesById(selectedIds.length > 0 ? selectedIds : [updated.id]);
		this.planManager.setGraph(plan.id, reconciled, true);
	}

	private openSubplan(subplanId: string): void
	{
		if (this.planManager.findPlan(subplanId) !== null) {
			this.planManager.setActivePlan(subplanId);
		} else {
			this.notifications.show('This subplan no longer exists.');
		}
	}

	public closeAddNode(): void
	{
		this.addNodePositionSignal.set(null);
		this.pendingConnectSignal.set(null);
		this.addNodeSuggestedAmountSignal.set(null);
	}

	private restyleGraph(): void
	{
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}
		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch {
			return;
		}
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, graph, false);
	}

	public onAddNode(node: Node): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const position = this.addNodePositionSignal();
		const pending = this.pendingConnectSignal();
		this.closeAddNode();
		if (!position) {
			return;
		}

		const plan = this.planManager.activePlan();
		if (!plan || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		if (plan.graph) {
			try {
				graph = this.planSerializer.reviveGraph(plan.graph);
			} catch (err) {
				this.notifications.show('Could not add node: ' + String(err));
				return;
			}
		} else {
			graph = {nodes: [], edges: []};
		}

		this.history.push(this.snapshotOf(plan));

		const origin = pending ? graph.nodes.find(candidate => candidate.id === pending.nodeId) ?? null : null;
		this.placeAddedNode(node, position, origin, this.graphLayout.resolve(plan.settings.graph).direction === 'down');

		const updated: Graph = {nodes: [...graph.nodes, node], edges: [...graph.edges]};
		const edge = pending ? this.connectingEdgeFor(updated, pending, node) : null;
		if (edge) {
			updated.edges.push(edge);
		}
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.plannerGraph.selectNodeById(node.id);
		this.planManager.setGraph(plan.id, updated, true);
	}

	/** For connect gestures the border facing the origin lands on the point, so the edge ends at the drop; plain adds center on it. */
	private placeAddedNode(node: Node, position: GraphPoint, origin: Node | null, verticalLayout: boolean): void
	{
		const size = this.plannerGraph.nodeSize(node);
		if (!origin) {
			node.x = position.x - size.width / 2;
			node.y = position.y - size.height / 2;
			return;
		}
		const originSize = this.plannerGraph.nodeSize(origin);
		if (verticalLayout) {
			node.x = position.x - size.width / 2;
			node.y = position.y >= origin.y + originSize.height / 2 ? position.y : position.y - size.height;
		} else {
			node.y = position.y - size.height / 2;
			node.x = position.x >= origin.x + originSize.width / 2 ? position.x : position.x - size.width;
		}
	}

	private connectingEdgeFor(graph: Graph, pending: GraphConnectToBlankRequest, added: Node): GraphEdge | null
	{
		if (!graph.nodes.some(node => node.id === pending.nodeId)) {
			return null;
		}
		const newNodeIos = pending.side === 'output' ? added.inputs : added.outputs;
		if (!newNodeIos.some(io => io.item.className === pending.itemClassName)) {
			return null;
		}
		const sourceId = pending.side === 'output' ? pending.nodeId : added.id;
		const targetId = pending.side === 'output' ? added.id : pending.nodeId;
		const amount = Math.min(
			this.graphReconciler.spareOutput(graph, sourceId, pending.itemClassName),
			this.graphReconciler.remainingDemand(graph, targetId, pending.itemClassName),
		);
		return {sourceId, targetId, itemClassName: pending.itemClassName, amount};
	}

	private createSubplanNode(position: GraphPoint): void
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		if (plan.graph) {
			try {
				graph = this.planSerializer.reviveGraph(plan.graph);
			} catch (err) {
				this.notifications.show('Could not create subplan: ' + String(err));
				return;
			}
		} else {
			graph = {nodes: [], edges: []};
		}

		this.history.push(this.snapshotOf(plan));

		const subplan = this.planManager.createSubplan(this.defaultSubplanName(plan.id), plan.id);
		const node = new SubplanNode(crypto.randomUUID(), subplan.id, subplan.name, [], []);
		const size = this.plannerGraph.nodeSize(node);
		node.x = position.x - size.width / 2;
		node.y = position.y - size.height / 2;

		const updated: Graph = {nodes: [...graph.nodes, node], edges: graph.edges};
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.plannerGraph.selectNodeById(node.id);
		this.planManager.setGraph(plan.id, updated, true);
	}

	private async convertToSubplan(nodeIds: string[]): Promise<void>
	{
		if (this.planManager.activePlanReadOnly()) {
			return;
		}
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}
		const data = this.versionManager.activeVersionData();
		if (!data) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not create subplan: ' + String(err));
			return;
		}

		const selectedIds = new Set(nodeIds);
		const selected = graph.nodes.filter(node => selectedIds.has(node.id));
		if (selected.length === 0 || selected.some(node => node instanceof SubplanNode)) {
			return;
		}

		const internal = graph.edges.filter(e => selectedIds.has(e.sourceId) && selectedIds.has(e.targetId));
		const inbound = graph.edges.filter(e => !selectedIds.has(e.sourceId) && selectedIds.has(e.targetId));
		const outbound = graph.edges.filter(e => selectedIds.has(e.sourceId) && !selectedIds.has(e.targetId));

		// Deep clones: layout repositions them, and the parent's instances must stay intact for the history snapshot.
		let subNodes: Node[];
		try {
			subNodes = this.planSerializer.reviveGraph(JSON.parse(JSON.stringify({nodes: selected, edges: []})) as Graph).nodes;
		} catch (err) {
			this.notifications.show('Could not create subplan: ' + String(err));
			return;
		}
		subNodes.forEach(node => node.locked = true);

		const boundaryNodes: Node[] = [];
		const boundaryEdges: GraphEdge[] = [];

		// Locked so recalculating the subplan keeps what the parent relies on.
		this.groupByItem(inbound).forEach((edges, itemClassName) => {
			const amount = edges.reduce((sum, e) => sum + e.amount, 0);
			const node = new InputNode(crypto.randomUUID(), amount, data.getItemByClassName(itemClassName));
			node.locked = true;
			boundaryNodes.push(node);
			edges.forEach(e => boundaryEdges.push({sourceId: node.id, targetId: e.targetId, itemClassName, amount: e.amount}));
		});

		this.groupByItem(outbound).forEach((edges, itemClassName) => {
			const amount = edges.reduce((sum, e) => sum + e.amount, 0);
			const node = new ProductNode(crypto.randomUUID(), amount, data.getItemByClassName(itemClassName));
			node.locked = true;
			boundaryNodes.push(node);
			edges.forEach(e => boundaryEdges.push({sourceId: e.sourceId, targetId: node.id, itemClassName, amount: e.amount}));
		});

		const subGraph: Graph = {
			nodes: [...subNodes, ...boundaryNodes],
			edges: [...internal.map(e => ({...e, vertices: undefined, labelDistance: undefined})), ...this.mergeParallelEdges(boundaryEdges)],
		};
		try {
			await this.plannerGraph.layout(subGraph.nodes, subGraph.edges, plan.settings.graph);
		} catch (err) {
			this.notifications.show('Could not create subplan: ' + String(err));
			return;
		}

		this.history.push(this.snapshotOf(plan));

		const subplan = this.planManager.createSubplan(this.defaultSubplanName(plan.id), plan.id);
		this.planManager.setGraph(subplan.id, subGraph, true);

		const io = this.subplanResolver.resolveGraph(subGraph);
		const subplanNode = new SubplanNode(crypto.randomUUID(), subplan.id, subplan.name, io.inputs, io.outputs);
		subplanNode.x = selected.reduce((sum, n) => sum + n.x, 0) / selected.length;
		subplanNode.y = selected.reduce((sum, n) => sum + n.y, 0) / selected.length;

		const retargeted = this.mergeParallelEdges([
			...inbound.map(e => ({...e, targetId: subplanNode.id})),
			...outbound.map(e => ({...e, sourceId: subplanNode.id})),
		]);
		const outside = graph.edges.filter(e => !selectedIds.has(e.sourceId) && !selectedIds.has(e.targetId));

		const parentGraph: Graph = {
			nodes: [...graph.nodes.filter(n => !selectedIds.has(n.id)), subplanNode],
			edges: [...outside, ...retargeted],
		};

		this.plannerGraph.restore(this.graphContainerRef.nativeElement, parentGraph, false);
		this.plannerGraph.selectNodeById(subplanNode.id);
		this.planManager.setGraph(plan.id, parentGraph, true);
	}

	private groupByItem(edges: GraphEdge[]): Map<string, GraphEdge[]>
	{
		const groups = new Map<string, GraphEdge[]>();
		edges.forEach(edge => {
			const group = groups.get(edge.itemClassName) ?? [];
			group.push(edge);
			groups.set(edge.itemClassName, group);
		});
		return groups;
	}

	private mergeParallelEdges(edges: GraphEdge[]): GraphEdge[]
	{
		const merged = new Map<string, GraphEdge>();
		edges.forEach(edge => {
			const key = `${edge.sourceId}|${edge.targetId}|${edge.itemClassName}`;
			const existing = merged.get(key);
			if (existing) {
				existing.amount += edge.amount;
				delete existing.vertices;
				delete existing.labelDistance;
			} else {
				merged.set(key, edge);
			}
		});
		return [...merged.values()];
	}

	private defaultSubplanName(parentPlanId: string): string
	{
		const names = new Set(this.planManager.plans()
			.filter(p => p.parentPlanId === parentPlanId)
			.map(p => p.name));
		if (!names.has('New Subplan')) {
			return 'New Subplan';
		}
		let counter = 2;
		while (names.has(`New Subplan ${counter}`)) {
			counter++;
		}
		return `New Subplan ${counter}`;
	}

	/** Returns the same instance when nothing changed. */
	private refreshSubplanNodes(graph: Graph): Graph
	{
		let changed = false;
		const nodes = graph.nodes.map(node => {
			if (!(node instanceof SubplanNode)) {
				return node;
			}
			const refreshed = this.subplanResolver.refresh(node);
			changed = changed || refreshed !== node;
			return refreshed;
		});
		return changed ? {nodes, edges: graph.edges} : graph;
	}

	private refreshScrubbedGraph(planIds: string[]): void
	{
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId || !planIds.includes(plan.id)) {
			return;
		}
		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch {
			return;
		}
		if (!this.planManager.isReadOnlyPlan(plan.id)) {
			const refreshed = this.refreshSubplanNodes(graph);
			if (refreshed !== graph) {
				graph = refreshed;
				this.planManager.setGraph(plan.id, graph);
			}
		}
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, graph, false);
	}

	private refreshRenderedSubplanNodes(): void
	{
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch {
			return;
		}

		const refreshed = this.refreshSubplanNodes(graph);
		if (refreshed === graph && graph === plan.graph) {
			return;
		}
		this.planManager.setGraph(plan.id, refreshed);
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, refreshed, false);
	}

	private renderPlan(plan: Plan | null): void
	{
		this.history.clear();
		if (!plan) {
			this.renderedPlanId = null;
			this.plannerGraph.clear();
			return;
		}
		// Read-only plans render as saved: their subplans share the read-only store, and nothing is written back.
		const readOnly = this.planManager.isReadOnlyPlan(plan.id);
		this.plannerGraph.readOnly = readOnly;
		if (!plan.graph) {
			this.renderedPlanId = plan.id;
			this.plannerGraph.restore(this.graphContainerRef.nativeElement, {nodes: [], edges: []});
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			console.error('Failed to revive plan graph:', err);
			this.renderedPlanId = plan.id;
			this.plannerGraph.clear();
			return;
		}

		if (!readOnly) {
			graph = this.refreshSubplanNodes(graph);
		}

		this.renderedPlanId = plan.id;
		if (!readOnly && graph !== plan.graph) {
			this.planManager.setGraph(plan.id, graph);
		}
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, graph);
	}

	private calculate(): void
	{
		if (this.planManager.activePlanReadOnly()) return;
		const plan = this.planManager.activePlan();
		if (!plan) return;
		if (this.actions.isCalculating()) {
			if (this.modeOf(plan) !== 'automatic') return;
			this.cancelCalculation();
		}
		const validRequests = plan.requests.filter(r => r.itemClassName !== '');

		// Append mode's island is self-contained by design, so no locks.
		const existing = this.existingGraph(plan);
		const lockedNodes = this.modeOf(plan) === 'manual-append'
			? []
			: existing?.nodes.filter(node => node.locked) ?? [];

		if (validRequests.length === 0 && lockedNodes.length === 0) return;

		let result$;
		try {
			result$ = this.productionSolver.solve({...plan, requests: validRequests}, lockedNodes);
		} catch (err) {
			this.actions.setSolveError('error', 'Could not start the calculation: ' + String(err));
			return;
		}

		this.actions.setCalculating(true);
		this.actions.setSolveError(null);
		this.calcSubscription = result$.pipe(finalize(() => this.actions.setCalculating(false))).subscribe({
			next: result => {
				if (result.status !== 'Optimal') {
					this.actions.setSolveError('no solution');
					this.explainSolveFailure({...plan, requests: validRequests}, lockedNodes);
					return;
				}
				this.history.push(this.snapshotOf(plan));
				void this.applyResult(plan, result, existing).then(graph => {
					this.renderedPlanId = plan.id;
					this.planManager.setGraph(plan.id, graph, false);
					// Undefined clears stale maximise results.
					this.planManager.setAchievedMaximums(plan.id, result.achievedMaximums);
				}).catch(err => {
					this.actions.setSolveError('error', 'Could not draw the graph: ' + String(err));
				});
			},
			error: err => {
				console.error('Solver error:', err);
				this.actions.setSolveError('error', 'Calculation failed: ' + String(err instanceof Error ? err.message : err));
			},
		});
	}

	/** Unsubscribing kills the solver worker. */
	private cancelCalculation(): void
	{
		this.calcSubscription?.unsubscribe();
		this.calcSubscription = null;
	}

	private explainSolveFailure(plan: Plan, lockedNodes: Node[]): void
	{
		this.subscription.add(
			this.productionSolver.diagnoseFailure(plan, lockedNodes).subscribe(message => {
				const hint = lockedNodes.length > 0 ? ' Locked nodes also limit what is possible.' : '';
				this.actions.setSolveError('no solution', message + hint);
			}),
		);
	}

	private async applyResult(plan: Plan, result: SolverResponse, existing: Graph | null): Promise<Graph>
	{
		const container = this.graphContainerRef.nativeElement;
		const mode = this.modeOf(plan);
		const hasLocks = existing?.nodes.some(node => node.locked) ?? false;

		if (existing && mode === 'manual-append') {
			const additionEdges = this.edgeBuilder.build(result.nodes);
			await this.plannerGraph.layout(result.nodes, additionEdges, plan.settings.graph);
			const graph = this.graphComposer.append(existing, {nodes: result.nodes, edges: additionEdges});
			this.plannerGraph.restore(container, graph);
			return graph;
		}

		if (existing && mode === 'manual-upgrade') {
			const merged = this.graphComposer.merge(existing, result.nodes);
			if (merged.newNodes.length > 0) {
				await this.plannerGraph.layout(merged.newNodes, merged.edges, plan.settings.graph);
				this.graphComposer.offsetBelow(merged.newNodes, merged.edges, existing.nodes);
			}
			const graph: Graph = {nodes: merged.nodes, edges: merged.edges};
			this.plannerGraph.restore(container, graph);
			return graph;
		}

		if (existing && hasLocks) {
			const rebuilt = this.graphComposer.rebuild(existing, result.nodes);
			await this.plannerGraph.layout(rebuilt.nodes, rebuilt.edges, plan.settings.graph);
			const graph: Graph = {nodes: rebuilt.nodes, edges: rebuilt.edges};
			this.plannerGraph.restore(container, graph);
			return graph;
		}

		return this.plannerGraph.render(container, result, plan.settings.graph);
	}

	private existingGraph(plan: Plan): Graph | null
	{
		if (!plan.graph || plan.graph.nodes.length === 0) {
			return null;
		}
		try {
			return this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			console.error('Failed to revive plan graph, calculating fresh:', err);
			return null;
		}
	}

	/** Plans saved before calculation modes existed have none. */
	private modeOf(plan: Plan): CalculationMode
	{
		return plan.settings.calculationMode ?? 'automatic';
	}

}
