import {AfterViewInit, Component, computed, ElementRef, HostListener, OnDestroy, signal, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {faBolt, faBook, faCoins, faCrosshairs, faCubes, faFolderTree, faGear, faListCheck} from '@fortawesome/free-solid-svg-icons';
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
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlannerContextMenuComponent} from '@src/Components/Planner/ContextMenu/PlannerContextMenuComponent';
import {PlannerContextMenuService} from '@src/Components/Planner/ContextMenu/PlannerContextMenuService';
import {PlannerNodeTooltipComponent} from '@src/Components/Planner/Tooltip/PlannerNodeTooltipComponent';
import {PlannerNodeTooltipService} from '@src/Components/Planner/Tooltip/PlannerNodeTooltipService';
import {GraphConnectToBlankRequest} from '@src/Components/Planner/GraphConnectToBlankRequest';
import {GraphContextMenuRequest} from '@src/Components/Planner/GraphContextMenuRequest';
import {GraphEdgeAddRequest} from '@src/Components/Planner/GraphEdgeAddRequest';
import {GraphEdgeAmountRequest} from '@src/Components/Planner/GraphEdgeAmountRequest';
import {GraphHistoryService} from '@src/Components/Planner/GraphHistoryService';
import {PreparedEdgeAdd} from '@src/Components/Planner/PreparedEdgeAdd';
import {NodeLockRequest} from '@src/Components/Planner/NodeLockRequest';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {PlannerPanelContainerComponent} from '@src/Components/Planner/Panel/PlannerPanelContainerComponent';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {CalculatorComponent} from '@src/Components/Planner/Panels/Calculator/CalculatorComponent';
import {PlannerCodexComponent} from '@src/Components/Planner/Panels/Codex/PlannerCodexComponent';
import {PlannerBuildCostComponent} from '@src/Components/Planner/Panels/BuildCost/PlannerBuildCostComponent';
import {PlannerInspectorComponent} from '@src/Components/Planner/Panels/Inspector/PlannerInspectorComponent';
import {PlannerItemsComponent} from '@src/Components/Planner/Panels/Items/PlannerItemsComponent';
import {PlannerPlansComponent} from '@src/Components/Planner/Panels/Plans/PlannerPlansComponent';
import {PlannerPowerComponent} from '@src/Components/Planner/Panels/Power/PlannerPowerComponent';
import {PlannerSettingsComponent} from '@src/Components/Planner/Panels/Settings/PlannerSettingsComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {CalculationMode} from '@src/Model/Planner/CalculationMode';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphComposer} from '@src/Model/Planner/Graph/GraphComposer';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphLayoutDefaults} from '@src/Model/Planner/GraphLayoutDefaults';
import {GraphMetrics} from '@src/Model/Planner/Graph/GraphMetrics';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';
import {GraphSnapshot} from '@src/Model/Planner/Graph/GraphSnapshot';
import {GraphEdgeBuilder} from '@src/Model/Planner/Graph/GraphEdgeBuilder';
import {GraphReconciler} from '@src/Model/Planner/Graph/GraphReconciler';
import {NodeResizer} from '@src/Model/Planner/NodeResizer';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {SolverResponse} from '@src/Model/Planner/Solver/Response/SolverResponse';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlannerLocationService} from '@src/Model/Planner/PlannerLocationService';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';
import {NotificationService} from '@src/Model/NotificationService';
import {ProductionSolverService} from '@src/Model/Planner/ProductionSolverService';
import {RateFormatter} from '@src/Model/RateFormatter';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

// Flows closer than this count as equal when deciding whether a menu action
// (minimise/maximise, increase-output) has anything to change - matches the
// reconciler's absolute warning tolerance.
const FLOW_TOLERANCE = 0.001;
// Same idea for node utilization ratios (1 = the node already matches its edges).
const RATIO_TOLERANCE = 1e-4;

@Component({
	templateUrl: './PlannerComponent.html',
	imports: [PlannerPanelContainerComponent, PlannerContextMenuComponent, PlannerNodeTooltipComponent, AddNodeDialogComponent],
	providers: [
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
export class PlannerComponent implements AfterViewInit, OnDestroy
{

	@ViewChild('graphContainer') private graphContainerRef!: ElementRef<HTMLElement>;

	private readonly subscription = new Subscription();
	private calcSubscription: Subscription | null = null;
	private renderedPlanId: string | null = null;

	// Graph-local spot for the manual add-node dialog; non-null while it is open.
	private readonly addNodePositionSignal = signal<GraphPoint | null>(null);
	public readonly addNodeOpen = computed(() => this.addNodePositionSignal() !== null);

	// Connect gesture that ended on blank canvas - the add-node dialog then
	// completes it: it offers only matching node types and the new node is
	// wired to the gesture's origin on add.
	private readonly pendingConnectSignal = signal<GraphConnectToBlankRequest | null>(null);
	public readonly addNodeFilter = computed<AddNodeFilter | null>(() => {
		const pending = this.pendingConnectSignal();
		if (!pending) {
			return null;
		}
		return {itemClassName: pending.itemClassName, role: pending.side === 'output' ? 'consumer' : 'producer'};
	});

	// Free flow at the gesture's origin when it started, prefilled as the new node's rate.
	private readonly addNodeSuggestedAmountSignal = signal<number | null>(null);
	public readonly addNodeSuggestedAmount = this.addNodeSuggestedAmountSignal.asReadonly();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly planSerializer: PlanSerializer,
		private readonly productionSolver: ProductionSolverService,
		private readonly graphComposer: GraphComposer,
		private readonly graphReconciler: GraphReconciler,
		private readonly nodeResizer: NodeResizer,
		private readonly edgeBuilder: GraphEdgeBuilder,
		private readonly plannerGraph: PlannerGraphService,
		private readonly panelLayout: PanelLayoutService,
		private readonly actions: PlannerActionsService,
		private readonly history: GraphHistoryService,
		private readonly contextMenu: PlannerContextMenuService,
		private readonly versionManager: VersionManager,
		private readonly subplanResolver: SubplanIOResolver,
		private readonly notifications: NotificationService,
		private readonly rateFormatter: RateFormatter,
		private readonly settings: SettingsManager,
		private readonly plannerLocation: PlannerLocationService,
		private readonly route: ActivatedRoute,
		private readonly router: Router,
	)
	{
		panelLayout.register({
			id: 'plans',
			label: 'Plans',
			icon: faFolderTree,
			component: PlannerPlansComponent,
			defaultSide: 'left',
			openByDefault: true,
		});
		panelLayout.register({
			id: 'calculator',
			label: 'Production request',
			icon: faListCheck,
			component: CalculatorComponent,
			defaultSide: 'top',
			openByDefault: true,
		});
		panelLayout.register({
			id: 'settings',
			label: 'Planner settings',
			icon: faGear,
			component: PlannerSettingsComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'inspector',
			label: 'Inspector',
			icon: faCrosshairs,
			component: PlannerInspectorComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'power',
			label: 'Power',
			icon: faBolt,
			component: PlannerPowerComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'items',
			label: 'Items',
			icon: faCubes,
			component: PlannerItemsComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'build-cost',
			label: 'Build cost',
			icon: faCoins,
			component: PlannerBuildCostComponent,
			defaultSide: 'right',
		});
		panelLayout.register({
			id: 'codex',
			label: 'Codex',
			icon: faBook,
			component: PlannerCodexComponent,
			defaultSide: 'right',
			defaultFloating: true,
			defaultFloatWidth: 500,
			defaultFloatHeight: 400,
		});

		// Restore the remembered panel layout now that every panel is registered.
		panelLayout.applyLayout(this.settings.panels());

		// A refreshed or shared URL with ?codex=… must show the codex even if
		// the remembered layout has that panel closed.
		if (this.route.snapshot.queryParamMap.has('codex')) {
			panelLayout.focusPanel('codex');
		}

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
			this.actions.nodeDeleteRequests.subscribe(nodeIds => this.applyNodeDelete(nodeIds)),
		);

		// Node appearance settings (global colours/glow/machine display, number
		// formatting, per-plan machine colours) only affect styling, so re-render
		// the current graph in place - no re-layout or solve - whenever they change.
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
			this.actions.undoRequests.subscribe(() => this.undo()),
		);

		this.subscription.add(
			this.actions.redoRequests.subscribe(() => this.redo()),
		);

		// Automatic mode: recalculate when the active plan's solver inputs
		// change - requests, enabled recipes or raw-resource limits. pairwise
		// + same-id guard keeps plan switches and graph saves from triggering
		// a solve - only actual edits do.
		this.subscription.add(
			toObservable(computed(() => {
				const plan = this.planManager.activePlan();
				return plan === null ? null : {
					id: plan.id,
					mode: this.modeOf(plan),
					requestsKey: JSON.stringify({
						requests: plan.requests,
						inputs: plan.inputs,
						recipes: plan.settings.enabledRecipes,
						limits: plan.settings.resourceLimits,
						fuels: plan.settings.enabledFuels,
						sinkable: plan.settings.sinkableItems,
						factoryPower: [plan.settings.producePowerForFactory, plan.settings.excessPowerPercent],
						optimisation: plan.settings.optimisation,
						sloops: [plan.settings.maxSloops, plan.settings.sloopAccuracy],
						clocks: [plan.settings.defaultClockSpeed, plan.settings.recipeClockSpeeds],
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
				// A manually modified graph pauses automatic recalculation; a
				// declined confirm keeps the request edit but stays paused.
				// Dirty clears when the solve completes, not on confirm.
				if ((plan.metadata?.graphDirty ?? false) && !this.actions.confirmGraphOverwrite()) {
					return;
				}
				this.calculate();
			}),
		);

		this.subscription.add(
			this.plannerGraph.contextMenuRequests.subscribe(request => this.openContextMenu(request)),
		);

		// Edge corner gestures snapshot the pre-change state for undo, once
		// per gesture (the service fires before applying the first change).
		this.subscription.add(
			this.plannerGraph.graphEditStarts.subscribe(() => {
				const plan = this.planManager.activePlan();
				if (plan && plan.id === this.renderedPlanId) {
					this.history.push(this.snapshotOf(plan));
				}
			}),
		);

		// Node drags and edge corner edits mutate the rendered graph in
		// place; debounce to one save per gesture.
		this.subscription.add(
			this.plannerGraph.graphChanges.pipe(debounceTime(500)).subscribe(() => {
				const planId = this.planManager.activePlanId();
				if (planId !== null && planId === this.renderedPlanId) {
					this.planManager.touchGraph(planId);
				}
			}),
		);

		// URL → state: activate the plan named by the ':planId' param once it
		// exists in the store (plans may arrive async from the API).
		this.subscription.add(
			combineLatest([this.route.paramMap, toObservable(this.planManager.plans)]).subscribe(([params, plans]) => {
				const planId = params.get('planId');
				if (!planId || planId === this.planManager.activePlanId()) return;
				if (plans.some(p => p.id === planId)) {
					this.planManager.setActivePlan(planId);
				}
			}),
		);

		// State → URL: reflect the active plan in the address bar. skip(1)
		// ignores the initial null so a shared link isn't stripped on load.
		// Query params carry independent state (the codex panel), so keep them.
		this.subscription.add(
			toObservable(this.planManager.activePlanId).pipe(skip(1)).subscribe(id => {
				if (id === this.route.snapshot.paramMap.get('planId')) return;
				const version = this.versionManager.activeVersion();
				if (!version) return;
				const slug = this.versionManager.urlSlug(version);
				void this.router.navigate(
					id ? ['/', slug, 'planner', id] : ['/', slug, 'planner'],
					{queryParamsHandling: 'preserve'},
				);
			}),
		);

		// Closing the codex panel drops its query param, so a refresh doesn't
		// resurrect the panel the user just dismissed.
		this.subscription.add(
			toObservable(computed(() => this.panelLayout.isOpen('codex'))).pipe(skip(1)).subscribe(open => {
				if (!open && this.route.snapshot.queryParamMap.has('codex')) {
					void this.router.navigate([], {
						relativeTo: this.route,
						queryParams: {codex: null},
						queryParamsHandling: 'merge',
					});
				}
			}),
		);

		// Remember where the planner was left so the navbar can offer a way
		// back from non-versioned pages (account, settings, …).
		this.subscription.add(
			this.route.paramMap.subscribe(params => {
				const version = this.versionManager.activeVersion();
				if (!version) return;
				this.plannerLocation.remember(this.versionManager.urlSlug(version), params.get('planId'));
			}),
		);

		this.subscription.add(
			toObservable(this.planManager.activePlan).pipe(skip(1)).subscribe(plan => {
				if (plan?.id === this.renderedPlanId) return;
				this.actions.setSolveError(null);
				this.renderPlan(plan);
			}),
		);

		// Renaming a subplan must relabel its node in the parent graph, which
		// may be the plan currently on the canvas.
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
	}

	public ngAfterViewInit(): void
	{
		const plan = this.planManager.activePlan();
		if (plan) {
			this.renderPlan(plan);
		}
	}

	public ngOnDestroy(): void
	{
		this.cancelCalculation();
		this.subscription.unsubscribe();
	}

	private openContextMenu(request: GraphContextMenuRequest): void
	{
		let menu: PlannerContextMenu;
		if (request.edge) {
			const amounts = this.edgeAmountActions(request.edge);
			menu = new EdgeContextMenu(request.edge, this.edgeMenuTitle(request.edge), amounts.minimise, amounts.maximise, this.actions);
		} else if (request.nodes.length === 0) {
			menu = new BlankContextMenu(this.actions, request.local);
		} else if (request.nodes.length === 1) {
			menu = new NodeContextMenu(request.nodes[0], this.nodeResizeOptions(request.nodes[0]), this.actions, this.panelLayout, this.plannerGraph);
		} else {
			menu = new MultiNodeContextMenu(request.nodes, this.actions);
		}
		this.contextMenu.open(menu, request.clientX, request.clientY);
	}

	/** Edge menu heading: the flowing item and its rate, matching the edge label. */
	private edgeMenuTitle(edge: GraphEdge): string
	{
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(edge.itemClassName) ?? null;
		return `${item?.name ?? edge.itemClassName} - ${this.rateFormatter.rate(edge.amount, item)}`;
	}

	/** The active plan's graph revived for a read-only computation; null when unavailable. */
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

	/**
	 * The edge menu's minimise/maximise targets: what this edge could carry
	 * given the source's output (net of its other edges) and the target's
	 * requirement (net of its other suppliers). Null entries render grayed -
	 * when both ends agree there is nothing to choose, and a bound the edge
	 * already sits at is no change.
	 */
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

	/**
	 * The node menu's minimise/maximise replacements: the node scaled to the
	 * smallest/largest utilization its connected edges imply (per item with
	 * at least one edge; unconnected items don't count). Null when the node
	 * cannot resize, has no edges, or already sits at that size.
	 */
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
		// Minimise shrinks (some edge implies a smaller size), maximise grows -
		// a node already matching its edges grays both.
		const minRatio = Math.min(...ratios);
		const maxRatio = Math.max(...ratios);
		return {
			minimise: minRatio < 1 - RATIO_TOLERANCE ? this.nodeResizer.scaled(node, minRatio) : null,
			maximise: maxRatio > 1 + RATIO_TOLERANCE ? this.nodeResizer.scaled(node, maxRatio) : null,
		};
	}

	/**
	 * Swaps a manually edited node into the active plan's graph, reconciles
	 * flows (byproduct nodes, edge amounts, warnings) and persists the result
	 * as a manual modification - marking the graph dirty.
	 */
	private applyNodeUpdate(updated: Node): void
	{
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

		// Snapshot before reconciliation - it adjusts edge amounts in place.
		this.history.push(this.snapshotOf(plan));

		const replaced: Graph = {
			nodes: current.nodes.map(node => node.id === updated.id ? updated : node),
			edges: current.edges,
		};
		const reconciled = this.graphReconciler.reconcile(replaced, updated.id);

		this.plannerGraph.restore(this.graphContainerRef.nativeElement, reconciled, false);
		this.plannerGraph.selectNodeById(updated.id);
		this.planManager.setGraph(plan.id, reconciled, true);
	}

	/**
	 * Inserts a user-drawn edge between two existing nodes. By default the
	 * edge carries as much flow as both ends still have free; when the
	 * source falls short of the target's demand and could be grown, a small
	 * menu at the drop point offers to increase its output instead.
	 */
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

	/** Validates an edge-add request against the current plan; null when it no longer applies. */
	private prepareEdgeAdd(request: GraphEdgeAddRequest): PreparedEdgeAdd | null
	{
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

	/** The default insertion: the edge carries min(free output, unmet demand). */
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

	/**
	 * The source cannot cover the target's demand: let the user choose
	 * between growing the source and connecting only the free amount. Both
	 * actions re-validate - the graph may have changed while the menu was
	 * open - and dismissing the menu creates no edge.
	 */
	private openEdgeShortageMenu(request: GraphEdgeAddRequest, prepared: PreparedEdgeAdd, deficit: number): void
	{
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(request.itemClassName) ?? null;
		const menu = new EdgeShortageMenu(
			`${item?.name ?? request.itemClassName} - needs ${this.rateFormatter.rate(prepared.demand, item)}, ${this.rateFormatter.rate(prepared.spare, item)} free`,
			`Increase output by ${this.rateFormatter.rate(deficit, item)}`,
			`Keep output (edge gets ${this.rateFormatter.rate(prepared.spare, item)})`,
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

	/**
	 * Grows the source to cover the target's demand and connects the full
	 * amount. Runs through the reconciler like any node edit, so the grown
	 * source draws its own extra inputs from upstream spare where possible.
	 */
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

	/**
	 * Sets one edge's flow (minimise/maximise). Elastic endpoints - input
	 * node source, byproduct node target - follow the new flow so their
	 * labels stay truthful; everything else surfaces as warnings.
	 */
	private applyEdgeAmount(request: GraphEdgeAmountRequest): void
	{
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not change edge amount: ' + String(err));
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

	/** Resizes an input-node source / byproduct-node target of the changed edge to the flow they now carry. */
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

	/**
	 * Removes one edge. Nothing else changes: the freed flow stays with the
	 * producer and the consumer's shortfall surfaces as the usual warnings.
	 * Edges have no id, so the request edge is matched by its unique
	 * source/target/item triple.
	 */
	private applyEdgeDelete(edge: GraphEdge): void
	{
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not delete edge: ' + String(err));
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

	/**
	 * Removes nodes together with every edge touching them. A subplan node
	 * only detaches from this graph - its plan stays in the plans tree.
	 */
	private applyNodeDelete(nodeIds: string[]): void
	{
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
		if (!graph.nodes.some(node => ids.has(node.id))) {
			return;
		}

		this.history.push(this.snapshotOf(plan));

		const updated: Graph = {
			nodes: graph.nodes.filter(node => !ids.has(node.id)),
			edges: graph.edges.filter(edge => !ids.has(edge.sourceId) && !ids.has(edge.targetId)),
		};
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.planManager.setGraph(plan.id, updated, true);
	}

	/**
	 * A connect gesture dropped on blank canvas: open the add-node dialog
	 * there, restricted to node types that can take the dragged item, with
	 * the origin's free flow as the suggested rate. onAddNode() finishes the
	 * job by wiring the new node to the gesture's origin.
	 */
	private beginConnectToBlank(request: GraphConnectToBlankRequest): void
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

	@HostListener('document:keydown', ['$event'])
	public onDocumentKeyDown(event: KeyboardEvent): void
	{
		// Form fields keep their native editing keys (text undo, delete).
		const active = document.activeElement;
		if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
			|| active instanceof HTMLSelectElement || (active instanceof HTMLElement && active.isContentEditable)) {
			return;
		}
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
			event.preventDefault();
			if (event.shiftKey) {
				this.redo();
			} else {
				this.undo();
			}
			return;
		}
		if (event.key === 'Delete') {
			const nodeIds = this.plannerGraph.selectedNodes().map(node => node.id);
			if (nodeIds.length > 0) {
				event.preventDefault();
				this.applyNodeDelete(nodeIds);
			}
		}
	}

	private snapshotOf(plan: Plan): GraphSnapshot
	{
		return {
			planId: plan.id,
			graphJson: plan.graph ? JSON.stringify(plan.graph) : null,
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
		const plan = this.planManager.activePlan();
		if (!plan || plan.id !== this.renderedPlanId) {
			return;
		}
		const snapshot = pop(this.snapshotOf(plan));
		if (!snapshot || snapshot.planId !== plan.id) {
			return;
		}

		// Undo/redo always leaves the plan "modified": the restored graph may
		// no longer match the current request, so it must not read as up to date.
		if (snapshot.graphJson === null) {
			this.plannerGraph.clear();
			this.planManager.setGraph(plan.id, null, true);
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
	}

	/** Toggles user ownership of nodes; a lock change is a manual graph edit and persists as such. */
	private applyLockChange(request: NodeLockRequest): void
	{
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

		// Snapshot before the in-place lock flips.
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
		this.planManager.setGraph(plan.id, graph, true);
	}

	/**
	 * Re-lays the active plan's graph through ELK using the plan's layout
	 * settings - positions and edge routing only, no amounts change. The
	 * dirty flag stays as it is, matching manual node drags.
	 */
	private async relayoutGraph(): Promise<void>
	{
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId || this.actions.isCalculating()) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not re-layout graph: ' + String(err));
			return;
		}
		if (graph.nodes.length === 0) {
			return;
		}

		this.history.push(this.snapshotOf(plan));

		try {
			await this.plannerGraph.layout(graph.nodes, graph.edges, plan.settings.graph);
		} catch (err) {
			this.notifications.show('Could not re-layout graph: ' + String(err));
			return;
		}

		this.plannerGraph.restore(this.graphContainerRef.nativeElement, graph);
		this.planManager.setGraph(plan.id, graph);
	}

	private openSubplan(subplanId: string): void
	{
		if (this.planManager.plans().some(p => p.id === subplanId)) {
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

	/** Re-renders the current graph in place to pick up new node styling (colours/glow). */
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

	/**
	 * Inserts a manually built node at the spot the add-node dialog was
	 * opened from. When the dialog completes a connect-to-blank gesture, the
	 * new node is also wired to the gesture's origin, carrying as much flow
	 * as both ends have free.
	 */
	public onAddNode(node: Node): void
	{
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

		// A still-uncalculated plan starts from an empty graph (manual mode).
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
		this.placeAddedNode(node, position, origin, GraphLayoutDefaults.resolve(plan.settings.graph).direction === 'down');

		const updated: Graph = {nodes: [...graph.nodes, node], edges: [...graph.edges]};
		const edge = pending ? this.connectingEdgeFor(updated, pending, node) : null;
		if (edge) {
			updated.edges.push(edge);
		}
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.plannerGraph.selectNodeById(node.id);
		this.planManager.setGraph(plan.id, updated, true);
	}

	/**
	 * Positions a dialog-built node around the drop/click point. Plain adds
	 * center on it; a node completing a connect gesture instead starts at it -
	 * the border facing the gesture's origin passes through the point, so the
	 * drawn edge ends exactly where the drag was released.
	 */
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

	/** The edge completing a connect-to-blank gesture; null when either end cannot carry the item after all. */
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

	/** Creates a new empty subplan under the active plan, represented by a node at the clicked spot. */
	private createSubplanNode(position: GraphPoint): void
	{
		const plan = this.planManager.activePlan();
		if (!plan?.graph || plan.id !== this.renderedPlanId) {
			return;
		}

		let graph: Graph;
		try {
			graph = this.planSerializer.reviveGraph(plan.graph);
		} catch (err) {
			this.notifications.show('Could not create subplan: ' + String(err));
			return;
		}

		this.history.push(this.snapshotOf(plan));

		const subplan = this.planManager.createSubplan(this.defaultSubplanName(plan.id), plan.id);
		const node = new SubplanNode(crypto.randomUUID(), subplan.id, subplan.name, [], []);
		node.x = position.x - GraphMetrics.SUBPLAN_NODE_WIDTH / 2;
		node.y = position.y - GraphMetrics.SUBPLAN_NODE_HEIGHT / 2;

		const updated: Graph = {nodes: [...graph.nodes, node], edges: graph.edges};
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, updated, false);
		this.plannerGraph.selectNodeById(node.id);
		this.planManager.setGraph(plan.id, updated, true);
	}

	/**
	 * Extracts the given nodes into a new subplan under the active plan. The
	 * nodes move into the subplan as locked nodes with their connections
	 * intact; every severed connection becomes an input or product node
	 * there, and the subplan's graph is laid out from scratch. In the parent,
	 * a single subplan node takes their place and the severed edges re-attach
	 * to it.
	 */
	private async convertToSubplan(nodeIds: string[]): Promise<void>
	{
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

		// The subplan gets deep clones of the extracted nodes: the layout
		// below repositions them, and the parent's instances must stay intact
		// for the history snapshot (and in case anything here fails).
		let subNodes: Node[];
		try {
			subNodes = this.planSerializer.reviveGraph(JSON.parse(JSON.stringify({nodes: selected, edges: []})) as Graph).nodes;
		} catch (err) {
			this.notifications.show('Could not create subplan: ' + String(err));
			return;
		}
		// The extracted nodes become user-owned inside the subplan.
		subNodes.forEach(node => node.locked = true);

		const boundaryNodes: Node[] = [];
		const boundaryEdges: GraphEdge[] = [];

		// Boundary nodes are the subplan's outside interface - locked so a
		// recalculation of the subplan builds around them instead of dropping
		// what the parent graph relies on.
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

		// The subplan gets its own layout - routing carried over from the
		// parent would be meaningless around the new input/product nodes.
		const subGraph: Graph = {
			nodes: [...subNodes, ...boundaryNodes],
			edges: [...internal.map(e => ({...e, vertices: undefined, labelDistance: undefined})), ...boundaryEdges],
		};
		try {
			// The new subplan inherits this plan's layout settings, so lay its
			// graph out with them right away.
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
		// The parent-side node takes the extracted nodes' place.
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

	/** Re-attached edges can collapse onto the same source/target/item pair - merge their amounts. */
	private mergeParallelEdges(edges: GraphEdge[]): GraphEdge[]
	{
		const merged = new Map<string, GraphEdge>();
		edges.forEach(edge => {
			const key = `${edge.sourceId}|${edge.targetId}|${edge.itemClassName}`;
			const existing = merged.get(key);
			if (existing) {
				existing.amount += edge.amount;
				// Routing from either original edge no longer fits the merged flow.
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

	/** Returns the same graph when every subplan node is already up to date. */
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

	/** Re-renders the canvas when a subplan rename left a node label stale. */
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
		// Only ever called on plan switch or initial load - history is per plan.
		this.history.clear();
		if (!plan) {
			this.renderedPlanId = null;
			this.plannerGraph.clear();
			return;
		}
		if (!plan.graph) {
			// Manual mode builds from scratch: give an uncalculated plan an
			// interactive blank canvas so nodes can be added by right-click.
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

		// Subplans may have changed since the parent graph was saved - pick up
		// their current name and outside interface on every render.
		graph = this.refreshSubplanNodes(graph);

		this.renderedPlanId = plan.id;
		if (graph !== plan.graph) {
			this.planManager.setGraph(plan.id, graph);
		}
		this.plannerGraph.restore(this.graphContainerRef.nativeElement, graph);
	}

	private calculate(): void
	{
		const plan = this.planManager.activePlan();
		if (!plan) return;
		if (this.actions.isCalculating()) {
			// In automatic mode a newer request supersedes the running solve;
			// manual modes just wait for it (the button is disabled anyway).
			if (this.modeOf(plan) !== 'automatic') return;
			this.cancelCalculation();
		}
		const validRequests = plan.requests.filter(r => r.itemClassName !== '');

		// Locked nodes constrain the solve in every mode except append, whose
		// island is self-contained by design. Every locked node type becomes a
		// fixed LP column - recipes and subplans, but also manually placed
		// inputs, products, byproducts, mines, generators and sinks - so the
		// solver builds the rest of the plan around them.
		const existing = this.existingGraph(plan);
		const lockedNodes = this.modeOf(plan) === 'manual-append'
			? []
			: existing?.nodes.filter(node => node.locked) ?? [];

		// Locked nodes alone are enough to solve: the solver fills the production
		// their inputs demand. Only bail when there is genuinely nothing to build.
		if (validRequests.length === 0 && lockedNodes.length === 0) return;

		let result$;
		try {
			result$ = this.productionSolver.solve({...plan, requests: validRequests}, lockedNodes);
		} catch (err) {
			// Solver problems surface only as the closable label above the request panel.
			this.actions.setSolveError('solver error', 'Could not start solver: ' + String(err));
			return;
		}

		this.actions.setCalculating(true);
		this.actions.setSolveError(null);
		this.calcSubscription = result$.pipe(finalize(() => this.actions.setCalculating(false))).subscribe({
			next: result => {
				if (result.status !== 'Optimal') {
					this.actions.setSolveError(`solver: ${result.status}`);
					this.explainSolveFailure({...plan, requests: validRequests}, lockedNodes, result.status);
					return;
				}
				this.history.push(this.snapshotOf(plan));
				void this.applyResult(plan, result, existing).then(graph => {
					this.renderedPlanId = plan.id;
					this.planManager.setGraph(plan.id, graph, false);
				}).catch(err => {
					this.actions.setSolveError('graph render failed', 'Graph render failed: ' + String(err));
				});
			},
			error: err => {
				console.error('Solver error:', err);
				this.actions.setSolveError('solver error', 'Solver error: ' + String(err instanceof Error ? err.message : err));
			},
		});
	}

	/** Cancelling unsubscribes the in-flight solve, which kills the solver worker. */
	private cancelCalculation(): void
	{
		this.calcSubscription?.unsubscribe();
		this.calcSubscription = null;
	}

	/**
	 * Runs the failure diagnosis in the background (it may re-solve once) and
	 * surfaces the explanation as the closable label above the request panel.
	 */
	private explainSolveFailure(plan: Plan, lockedNodes: Node[], status: string): void
	{
		this.subscription.add(
			this.productionSolver.diagnoseFailure(plan, lockedNodes).subscribe(message => {
				const hint = lockedNodes.length > 0 ? ' Locked nodes also constrain the solution.' : '';
				this.actions.setSolveError(`solver: ${status}`, message + hint);
			}),
		);
	}

	/** Turns a solver result into the plan's new graph according to the plan's calculation mode. */
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
			// Automatic/fresh around locked nodes: the locked nodes' data
			// (recipe, groups, target) passes through, but the whole graph is
			// laid out from scratch - a partial solve looks exactly like a
			// fresh one. Position preservation is a future option.
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

	/** Plans saved before calculation modes existed have no mode - treat them as automatic. */
	private modeOf(plan: Plan): CalculationMode
	{
		return plan.settings.calculationMode ?? 'automatic';
	}

}
