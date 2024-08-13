import {Injectable, OnDestroy, Signal, signal} from '@angular/core';
import {faLock, faTriangleExclamation, IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {Cell, Edge as X6Edge, EdgeToolNativeItem, EdgeView, Graph as X6Graph, Node as X6Node, Selection} from '@antv/x6';
import type {Metadata as PortsMetadata, PortMetadata} from '@antv/x6/lib/model/port';
import type {Handle as VertexHandle} from '@antv/x6/lib/registry/tool/vertices';
import ELK from 'elkjs/lib/elk.bundled.js';
import type {ElkExtendedEdge, ElkNode} from 'elkjs';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';
import {Observable, Subject, Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {GraphContextMenuRequest} from '@src/Components/Planner/GraphContextMenuRequest';
import {GraphEdgeAddRequest} from '@src/Components/Planner/GraphEdgeAddRequest';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PortConnectGesture} from '@src/Components/Planner/PortConnectGesture';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {NodeTooltipContent} from '@src/Components/Planner/Tooltip/NodeTooltipContent';
import {PlannerNodeTooltipService} from '@src/Components/Planner/Tooltip/PlannerNodeTooltipService';
import {Item} from '@src/Model/Data/Entities/Item';
import {IconUrlService} from '@src/Model/Data/IconUrlService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {RateFormatter} from '@src/Model/RateFormatter';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphEdgeBuilder} from '@src/Model/Planner/Graph/GraphEdgeBuilder';
import {GraphLayoutDefaults} from '@src/Model/Planner/GraphLayoutDefaults';
import {GraphLayoutSettings} from '@src/Model/Planner/GraphLayoutSettings';
import {GraphMetrics} from '@src/Model/Planner/Graph/GraphMetrics';
import {GraphNodeCapacityWarning} from '@src/Model/Planner/Graph/GraphNodeCapacityWarning';
import {GraphNodeWarnings} from '@src/Model/Planner/Graph/GraphNodeWarnings';
import {GraphWarningEntry} from '@src/Model/Planner/Graph/GraphWarningEntry';
import {GraphReconciler} from '@src/Model/Planner/Graph/GraphReconciler';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SinkNode} from '@src/Model/Planner/Solver/Response/SinkNode';
import {SolverResponse} from '@src/Model/Planner/Solver/Response/SolverResponse';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

const NODE_WIDTH = GraphMetrics.NODE_WIDTH;
const NODE_HEIGHT = GraphMetrics.NODE_HEIGHT;

// Estimated on-screen size of an edge label (12px font, two lines with
// spacing, padded rect) - declared to ELK so the layout reserves room for
// each label.
const LABEL_CHAR_WIDTH = 6.8;
const LABEL_PADDING_X = 20;
const LABEL_HEIGHT = 46;
const LABEL_FONT_SIZE = 12;
const LABEL_LINE_HEIGHT = 20;

// The flowing item's icon sits at the left of the edge label; the text is
// nudged right by half the reserved icon strip so it stays centered in the
// remaining space.
const EDGE_ICON_SIZE = 24;
const EDGE_ICON_GAP = 4;
// The node's own icon (producing machine, or the item for IO nodes) - larger
// and vertically centered on the node's left side. Lock and somersloop
// indicators stack in the top-right.
const NODE_ICON_SIZE = 30;
const LEFT_ICON_SIZE = 40;
const LEFT_ICON_X = 12;
// Text is kept clear of the left icon: it centers in the band between the icon
// (plus a gap) on the left and a smaller padding on the right, so its bounding
// box never runs under the icon (at the cost of not centering in the whole node).
const TEXT_LEFT_INSET = LEFT_ICON_X + LEFT_ICON_SIZE + 6;
const TEXT_RIGHT_PAD = 16;
const TEXT_SHIFT = (TEXT_LEFT_INSET - TEXT_RIGHT_PAD) / 2;
// A faint somersloop-tinted outer glow marks slooped recipe nodes.
const SLOOP_GLOW_COLOR = '#c56cf0';
const LOCK_ICON_SIZE = 18;
const SLOOP_ICON_SIZE = 20;
const CORNER_INSET = 5;
// Second row of the top-right stack, where the lock drops when a sloop icon
// occupies the top row.
const LOCK_ROW2_Y = CORNER_INSET + SLOOP_ICON_SIZE + 3;

// Subplan node: input item icons down the left edge, outputs down the right,
// each a single column capped at SUBPLAN_IO_MAX rows (last row becomes "+N").
const SUBPLAN_IO_MAX = 5;
const SUBPLAN_IO_ICON = 20;
const SUBPLAN_IO_ROW_H = 20;
const SUBPLAN_IO_TOP = 40;

const NODE_STROKE_WIDTH = 1.5;

// Recipe node label layout: recipe name (larger) pinned near the top, the
// bold built-machine count under it, then one stat line per machine group.
// The node grows per group row and widens to fit the longest line.
const RECIPE_NAME_Y = 18;
const RECIPE_NAME_FONT_SIZE = 14;
const RECIPE_MACHINES_Y = 38;
const RECIPE_STATS_Y = 50;
const RECIPE_STATS_LINE_HEIGHT = 16;
const RECIPE_BOTTOM_PADDING = 10;
const RECIPE_MAX_WIDTH = 360;
// Estimated character widths per font (12px regular measures ~6.8px).
const RECIPE_NAME_CHAR_WIDTH = 8.6;
const RECIPE_BOLD_CHAR_WIDTH = 7.5;
const RECIPE_STATS_CHAR_WIDTH = 6.8;
const RECIPE_TEXT_PADDING_X = 30;
// A small somersloop icon replaces the "S" at the end of each slooped machine
// group's stat line; one badge slot per line up to this cap.
const STAT_SLOOP_SIZE = 12;
// Negative because the somersloop icon has ~25% transparent padding on each
// side, so the box must overlap the text a little for the glyph to sit snug.
const STAT_SLOOP_GAP = -1;
const STAT_SLOOP_MAX_LINES = 8;
// The stat line's glyphs sit centered ~5px below RECIPE_STATS_Y (measured from
// the rendered text box); the badge centers on that so it lines up with them.
const STAT_SLOOP_CENTER_OFFSET = 5;
// Hide the new-corner preview this close (graph units) to an existing corner
// handle - clicking there grabs the handle instead of adding a corner.
const CORNER_PREVIEW_SNAP = 10;
const EDGE_STROKE = '#5c718a';
const EDGE_STROKE_WIDTH = 1.5;
const SELECTED_STROKE = '#f0ad4e';
const SELECTED_STROKE_WIDTH = 3;
const SELECTED_EDGE_STROKE_WIDTH = 2.5;
const HOVER_NODE_STROKE_WIDTH = 2.5;
const HOVER_EDGE_STROKE = '#8ea9c9';
const HOVER_EDGE_STROKE_WIDTH = 2.5;

// Connection ports: one grip per distinct IO item - inputs along one node
// edge, outputs along the opposite one (which pair depends on the layout
// direction). Ports are hidden until their node is hovered; during a connect
// drag the ports that could accept the dragged item show on every node
// instead (see the pg-port rules in styles.scss).
const PORT_RADIUS = 8;
const PORT_ICON_SIZE = 12;
const PORT_FILL = '#141c28';
const PORT_STROKE = '#8ea9c9';
const CONNECT_SNAP_RADIUS = 30;

// One somersloop badge slot per possible machine-group stat line; positioned
// and shown per node in recipeSloopBadges(), invisible (no href) otherwise.
const statSloopMarkup = [];
const statSloopAttrs: Record<string, object> = {};
for (let i = 0; i < STAT_SLOOP_MAX_LINES; i++) {
	statSloopMarkup.push({tagName: 'image', selector: `statSloop${i}`});
	statSloopAttrs[`statSloop${i}`] = {refX: 0.5, refY: 0, width: STAT_SLOOP_SIZE, height: STAT_SLOOP_SIZE};
}

X6Graph.registerNode('planner-node', {
	inherit: 'rect',
	markup: [
		{tagName: 'rect', selector: 'body'},
		{tagName: 'text', selector: 'name'},
		{tagName: 'text', selector: 'machines'},
		{tagName: 'text', selector: 'stats'},
		...statSloopMarkup,
		{tagName: 'image', selector: 'machineIcon', className: 'pn-machine'},
		{tagName: 'image', selector: 'sloop', className: 'pn-sloop'},
		{tagName: 'image', selector: 'lock', className: 'pn-lock'},
		{tagName: 'image', selector: 'inputWarning', className: 'pn-input-warning'},
		{tagName: 'image', selector: 'outputWarning', className: 'pn-output-warning'},
		{tagName: 'image', selector: 'capacityWarning', className: 'pn-capacity-warning'},
	],
	attrs: {
		body: {refWidth: '100%', refHeight: '100%'},
		...statSloopAttrs,
		machineIcon: {
			refX: 0,
			x: CORNER_INSET,
			refY: 0,
			y: CORNER_INSET,
			width: NODE_ICON_SIZE,
			height: NODE_ICON_SIZE,
		},
		// Top-right, top row; a slooped recipe node shows the sloop here.
		// refDx offsets from the right edge (refX: 1 is read as an absolute 1px).
		sloop: {
			refDx: -(SLOOP_ICON_SIZE + CORNER_INSET),
			refY: 0,
			y: CORNER_INSET,
			width: SLOOP_ICON_SIZE,
			height: SLOOP_ICON_SIZE,
			cursor: 'help',
		},
		// Top-right; drops to the second row (its y is set per node) when a sloop icon is present.
		lock: {
			refDx: -(LOCK_ICON_SIZE + CORNER_INSET),
			refY: 0,
			y: CORNER_INSET,
			width: LOCK_ICON_SIZE,
			height: LOCK_ICON_SIZE,
			cursor: 'help',
		},
		inputWarning: {
			refX: 0,
			x: CORNER_INSET,
			refY: 0.5,
			y: -7,
			width: 14,
			height: 14,
			cursor: 'help',
		},
		outputWarning: {
			refDx: -(14 + CORNER_INSET),
			refY: 0.5,
			y: -7,
			width: 14,
			height: 14,
			cursor: 'help',
		},
		// Bottom-right, clear of the top-right lock/sloop stack.
		capacityWarning: {
			refDx: -(14 + CORNER_INSET),
			refDy: -(14 + CORNER_INSET),
			width: 14,
			height: 14,
			cursor: 'help',
		},
		name: {
			refX: 0.5,
			refY: '38%',
			textAnchor: 'middle',
			textVerticalAnchor: 'middle',
			fontWeight: 'bold',
			fontSize: 12,
			fill: '#dde4ef',
		},
		machines: {
			refX: 0.5,
			refY: RECIPE_MACHINES_Y,
			textAnchor: 'middle',
			textVerticalAnchor: 'middle',
			fontWeight: 'bold',
			fontSize: 12,
			fill: '#c8d3e4',
		},
		stats: {
			refX: 0.5,
			refY: '72%',
			textAnchor: 'middle',
			textVerticalAnchor: 'middle',
			fontSize: 12,
			fill: '#aab8cc',
		},
	},
}, true);

// Subplan nodes get their own shape: a title, an in/out summary line, and two
// single-column stacks of item icons - inputs on the left edge, outputs on the
// right - each capped at SUBPLAN_IO_MAX rows with the last row an "+N" overflow.
const subplanIoMarkup = [];
const subplanIoAttrs: Record<string, object> = {};
for (let i = 0; i < SUBPLAN_IO_MAX; i++) {
	subplanIoMarkup.push({tagName: 'image', selector: `in${i}`});
	subplanIoMarkup.push({tagName: 'image', selector: `out${i}`});
	const y = SUBPLAN_IO_TOP + i * SUBPLAN_IO_ROW_H;
	subplanIoAttrs[`in${i}`] = {refX: 0, x: 10, refY: 0, y, width: SUBPLAN_IO_ICON, height: SUBPLAN_IO_ICON};
	subplanIoAttrs[`out${i}`] = {refDx: -(SUBPLAN_IO_ICON + 10), refY: 0, y, width: SUBPLAN_IO_ICON, height: SUBPLAN_IO_ICON};
}
const SUBPLAN_MORE_Y = SUBPLAN_IO_TOP + (SUBPLAN_IO_MAX - 1) * SUBPLAN_IO_ROW_H + SUBPLAN_IO_ICON / 2;

X6Graph.registerNode('planner-subplan-node', {
	inherit: 'rect',
	markup: [
		{tagName: 'rect', selector: 'body'},
		{tagName: 'text', selector: 'name'},
		{tagName: 'text', selector: 'stats'},
		...subplanIoMarkup,
		{tagName: 'text', selector: 'inMore'},
		{tagName: 'text', selector: 'outMore'},
		{tagName: 'image', selector: 'lock', className: 'pn-lock'},
	],
	attrs: {
		body: {refWidth: '100%', refHeight: '100%'},
		// Name and stats sit vertically centered between the IO icon columns,
		// sized up to match the node being larger than regular ones.
		name: {refX: 0.5, refY: 0.5, y: -10, textAnchor: 'middle', textVerticalAnchor: 'middle', fontWeight: 'bold', fontSize: 16, fill: '#dde4ef'},
		stats: {refX: 0.5, refY: 0.5, y: 12, textAnchor: 'middle', textVerticalAnchor: 'middle', fontSize: 13, fill: '#aab8cc'},
		...subplanIoAttrs,
		inMore: {refX: 0, x: 10, refY: 0, y: SUBPLAN_MORE_Y, textAnchor: 'start', textVerticalAnchor: 'middle', fontSize: 11, fill: '#aab8cc'},
		outMore: {refDx: -10, refY: 0, y: SUBPLAN_MORE_Y, textAnchor: 'end', textVerticalAnchor: 'middle', fontSize: 11, fill: '#aab8cc'},
		lock: {refDx: -(LOCK_ICON_SIZE + CORNER_INSET), refY: 0, y: CORNER_INSET, width: LOCK_ICON_SIZE, height: LOCK_ICON_SIZE, cursor: 'help'},
	},
}, true);

/** lock/inputWarning/outputWarning/capacityWarning carry icon data URIs; empty string hides the icon. */
interface NodeStyle {
	bodyFill: string;
	bodyStroke: string;
	name: string;
	/** Bold built-machine count line; only recipe nodes use it. */
	machines: string;
	stats: string;
	lock: string;
	inputWarning: string;
	outputWarning: string;
	capacityWarning: string;
}

@Injectable()
export class PlannerGraphService implements OnDestroy
{

	/**
	 * Read-only rendering (the share view): panning/zooming stay, but nodes
	 * cannot be moved, ports cannot connect and edges get no corner tools.
	 * Set before restore().
	 */
	public readOnly = false;

	private x6Graph: X6Graph | null = null;
	private selection: Selection | null = null;
	private cornerPreview: SVGCircleElement | null = null;
	private hoveredEdgeView: EdgeView | null = null;
	private hoverMoveTarget: HTMLElement | null = null;
	private readonly edgeHoverListener: (e: MouseEvent) => void;
	private readonly warningOverListener: (e: MouseEvent) => void;
	private readonly warningOutListener: (e: MouseEvent) => void;

	/** Local-coordinate start of a shift+rubberband gesture, null outside one. */
	private rubberbandStart: GraphPoint | null = null;
	/** Edge corners selected by the last rubberband: x6 edge id → vertex indices. */
	private readonly selectedVertexMap = new Map<string, number[]>();
	private vertexHighlights: SVGCircleElement[] = [];
	/**
	 * One node of the current selection whose position changes stand in for
	 * the whole selection drag - selected corners follow its move delta.
	 */
	private vertexDragAnchorId: string | null = null;
	private readonly nodeById = new Map<string, Node>();
	private readonly edgeById = new Map<string, GraphEdge>();

	private readonly selectedNodesSignal = signal<Node[]>([]);
	public readonly selectedNodes: Signal<Node[]> = this.selectedNodesSignal.asReadonly();

	/** Warning-bearing nodes of the rendered graph, for the status bar list. */
	private readonly warningEntriesSignal = signal<GraphWarningEntry[]>([]);
	public readonly warningEntries: Signal<GraphWarningEntry[]> = this.warningEntriesSignal.asReadonly();

	private readonly contextMenuSubject = new Subject<GraphContextMenuRequest>();
	public readonly contextMenuRequests: Observable<GraphContextMenuRequest> = this.contextMenuSubject.asObservable();

	/** Fires on in-place graph edits (node drags, edge corner changes). */
	private readonly graphChangedSubject = new Subject<void>();
	public readonly graphChanges: Observable<void> = this.graphChangedSubject.asObservable();

	/**
	 * Fires once at the start of an edge-corner gesture (move, add or click
	 * remove), while the model still holds the pre-change state - the moment
	 * to take an undo snapshot.
	 */
	private readonly graphEditStartSubject = new Subject<void>();
	public readonly graphEditStarts: Observable<void> = this.graphEditStartSubject.asObservable();

	/** True while a burst of vertex changes belongs to one already-snapshotted gesture. */
	private vertexGestureActive = false;
	private readonly gestureResetSubscription: Subscription;

	/** Under-supplied nodes (recomputed on every restore), node id → warnings. */
	private warningsById = new Map<string, GraphNodeWarnings>();

	/** The connect gesture in flight (dragged-from node, side and item); null outside one. */
	private connectGesture: PortConnectGesture | null = null;
	/** Ports marked available for the current gesture, unmarked when it ends. */
	private markedPorts: Array<{cell: X6Node; portId: string}> = [];
	/** Nodes dimmed for the current gesture (no port accepts the dragged item). */
	private dimmedNodeIds: string[] = [];

	private readonly lockIconUri = this.iconDataUri(faLock, '#c9962e');
	private readonly warningIconUri = this.iconDataUri(faTriangleExclamation, '#e58a72');

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly iconUrls: IconUrlService,
		private readonly rateFormatter: RateFormatter,
		private readonly panelLayout: PanelLayoutService,
		private readonly edgeBuilder: GraphEdgeBuilder,
		private readonly reconciler: GraphReconciler,
		private readonly nodeTooltip: PlannerNodeTooltipService,
		private readonly actions: PlannerActionsService,
		private readonly planManager: PlanManager,
		private readonly planNames: PlanNameResolver,
		private readonly settings: SettingsManager,
	)
	{
		this.edgeHoverListener = e => this.onEdgeHoverMove(e);
		this.warningOverListener = e => this.onWarningHover(e);
		this.warningOutListener = e => this.onWarningOut(e);
		// A gesture is one burst of vertex changes; the same quiet gap that
		// triggers the debounced save also closes the gesture.
		this.gestureResetSubscription = this.graphChangedSubject.pipe(debounceTime(500)).subscribe(() => {
			this.vertexGestureActive = false;
		});
	}

	public async render(container: HTMLElement, response: SolverResponse, settings?: GraphLayoutSettings): Promise<Graph>
	{
		if (response.nodes.length === 0) {
			this.createGraph(container);
			return {nodes: [], edges: []};
		}

		const edges = this.edgeBuilder.build(response.nodes);
		await this.layout(response.nodes, edges, settings);
		const graph: Graph = {nodes: response.nodes, edges};
		this.restore(container, graph);
		return graph;
	}

	/**
	 * Runs ELK layout on the given nodes and the subset of the given edges
	 * that connect two of them, writing positions onto the nodes and routing
	 * (vertices + label position) onto those edges. Coordinates start at the
	 * origin - callers placing an island beside an existing graph offset the
	 * result afterwards (see GraphComposer.offsetBelow / placeNear).
	 */
	public async layout(nodes: Node[], edges: GraphEdge[], layoutSettings?: GraphLayoutSettings): Promise<void>
	{
		if (nodes.length === 0) {
			return;
		}
		const settings = GraphLayoutDefaults.resolve(layoutSettings);

		const nodeIds = new Set(nodes.map(node => node.id));
		const layoutEdges = edges.filter(e => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));

		// Each edge declares its label size and asks for inline placement,
		// so ELK routes the edge through a reserved box for the label
		// instead of letting labels pile up mid-corridor.
		const elkEdges: ElkExtendedEdge[] = layoutEdges.map((e, i) => {
			const label = this.labelTextFor(e);
			const size = this.labelSizeFor(label);
			return {
				id: `e${i}`,
				sources: [e.sourceId],
				targets: [e.targetId],
				labels: [{
					id: `e${i}-label`,
					text: `${label.name}\n${label.rate}`,
					width: size.width,
					height: size.height,
					layoutOptions: {'elk.edgeLabels.inline': 'true'},
				}],
			};
		});

		const elkGraph: ElkNode = {
			id: 'root',
			layoutOptions: {
				'elk.algorithm': 'layered',
				'elk.direction': settings.direction === 'down' ? 'DOWN' : 'RIGHT',
				'elk.edgeRouting': 'POLYLINE',
				'elk.spacing.edgeLabel': '10',
				'elk.spacing.nodeNode': String(settings.nodeSpacing),
				'elk.layered.spacing.nodeNodeBetweenLayers': String(settings.layerSpacing),
			},
			children: nodes.map(node => ({
				id: node.id,
				...this.sizeFor(node),
			})),
			edges: elkEdges,
		};

		const elk = new ELK();
		const laid = await elk.layout(elkGraph);

		const posMap = new Map<string, {x: number; y: number}>();
		(laid.children ?? []).forEach(laidNode => {
			posMap.set(laidNode.id!, {x: laidNode.x ?? 0, y: laidNode.y ?? 0});
		});

		nodes.forEach((node, i) => {
			const pos = posMap.get(node.id) ?? {x: i * (NODE_WIDTH + 60), y: 0};
			node.x = pos.x;
			node.y = pos.y;
		});

		const laidEdgeById = new Map((laid.edges ?? []).map(laidEdge => [laidEdge.id, laidEdge]));
		layoutEdges.forEach((edge, i) => {
			const laidEdge = laidEdgeById.get(`e${i}`);
			if (laidEdge) {
				// Straight edges skip ELK's corners but keep its label spot -
				// projected onto the direct line it still lands about right.
				edge.vertices = settings.edgeShape === 'straight' ? [] : this.elkEdgeVertices(laidEdge);
				edge.labelDistance = this.elkLabelDistance(laidEdge);
			}
		});
	}

	/** Set fit to false to keep the current viewport, e.g. on in-place node updates. */
	public restore(container: HTMLElement, graph: Graph, fit = true): void
	{
		const previous = this.x6Graph && !fit
			? {zoom: this.x6Graph.zoom(), translate: this.x6Graph.translate()}
			: null;

		this.warningsById = this.reconciler.computeWarnings(graph);
		const x6Graph = this.createGraph(container);

		graph.nodes.forEach(node => this.addNode(x6Graph, node));
		graph.edges.forEach((edge, i) => this.addEdge(x6Graph, edge, i));
		this.warningEntriesSignal.set(this.buildWarningEntries(graph));

		if (previous) {
			x6Graph.zoom(previous.zoom, {absolute: true});
			x6Graph.translate(previous.translate.tx, previous.translate.ty);
		} else {
			this.zoomToVisibleArea(x6Graph);
		}
		this.trackNodeMoves(x6Graph, graph.nodes);
	}

	public clear(): void
	{
		this.nodeTooltip.hide();
		this.hideCornerPreview();
		this.clearVertexSelection();
		this.vertexDragAnchorId = null;
		this.hoveredEdgeView = null;
		this.connectGesture = null;
		this.markedPorts = [];
		this.dimmedNodeIds = [];
		this.hoverMoveTarget?.classList.remove('pg-connecting');
		this.hoverMoveTarget?.removeEventListener('mousemove', this.edgeHoverListener);
		this.hoverMoveTarget?.removeEventListener('mouseover', this.warningOverListener);
		this.hoverMoveTarget?.removeEventListener('mouseout', this.warningOutListener);
		this.hoverMoveTarget = null;
		this.x6Graph?.dispose();
		this.x6Graph = null;
		this.selection = null;
		this.warningsById = new Map();
		this.selectedNodesSignal.set([]);
		this.warningEntriesSignal.set([]);
	}

	/** The on-canvas box size a node will render at - for placing new nodes before they exist on the canvas. */
	public nodeSize(node: Node): {width: number; height: number}
	{
		return this.sizeFor(node);
	}

	/** Programmatically selects a node, e.g. to keep the inspector focused across a re-render. */
	public selectNodeById(id: string): void
	{
		const cell = this.x6Graph?.getCellById(id);
		if (cell?.isNode()) {
			this.selection?.reset(cell);
		}
	}

	/** Centers the viewport on a node (e.g. from the status bar warning list) and selects it. */
	public focusNode(id: string): void
	{
		const x6Graph = this.x6Graph;
		const cell = x6Graph?.getCellById(id);
		if (!x6Graph || !cell?.isNode()) {
			return;
		}
		if (x6Graph.zoom() < 0.8) {
			x6Graph.zoom(0.8, {absolute: true});
		}
		x6Graph.centerCell(cell);
		// Compensate for the panels overlaying the canvas edges, like zoomToVisibleArea does.
		const insets = this.panelLayout.canvasInsets();
		x6Graph.translateBy((insets.left - insets.right) / 2, (insets.top - insets.bottom) / 2);
		this.selection?.reset(cell);
	}

	private buildWarningEntries(graph: Graph): GraphWarningEntry[]
	{
		const entries: GraphWarningEntry[] = [];
		graph.nodes.forEach(node => {
			const warnings = this.warningsById.get(node.id);
			if (!warnings) {
				return;
			}
			const lines = [
				...warnings.inputs.map(warning => this.inputWarningLine(warning.itemClassName, warning.required, warning.supplied)),
				...warnings.outputs.map(warning => this.outputWarningLine(warning.itemClassName, warning.produced, warning.consumed)),
				...(warnings.capacity !== null ? [this.capacityWarningLine(warnings.capacity)] : []),
			];
			entries.push({nodeId: node.id, nodeName: node.getDisplayName(), lines});
		});
		return entries;
	}

	public zoomIn(): void
	{
		this.x6Graph?.zoom(0.2);
	}

	public zoomOut(): void
	{
		this.x6Graph?.zoom(-0.2);
	}

	public zoomFit(): void
	{
		if (this.x6Graph) {
			this.zoomToVisibleArea(this.x6Graph);
		}
	}

	/**
	 * The canvas spans the whole planner area but is partly covered by the
	 * rail, docked panels and status bar - fit the graph into the space that
	 * is actually visible. x6's zoomToFit derives the scale from the padding
	 * but always centers content on the full canvas, so the asymmetric part
	 * of the padding is applied as a translation afterwards.
	 */
	private zoomToVisibleArea(x6Graph: X6Graph): void
	{
		const insets = this.panelLayout.canvasInsets();
		const padding = {
			left: insets.left + 40,
			right: insets.right + 40,
			top: insets.top + 40,
			bottom: insets.bottom + 40,
		};
		x6Graph.zoomToFit({padding});
		x6Graph.translateBy((padding.left - padding.right) / 2, (padding.top - padding.bottom) / 2);
	}

	public ngOnDestroy(): void
	{
		this.gestureResetSubscription.unsubscribe();
		this.clear();
	}

	private createGraph(container: HTMLElement): X6Graph
	{
		this.nodeTooltip.hide();
		this.hideCornerPreview();
		this.clearVertexSelection();
		this.vertexDragAnchorId = null;
		this.hoveredEdgeView = null;
		this.x6Graph?.dispose();

		const x6Graph = new X6Graph({
			container,
			autoResize: true,
			panning: true,
			mousewheel: true,
			// Edges are reshaped through their corner handles only - dragging
			// the line itself must not translate the whole edge. Read-only
			// rendering turns all cell interaction off.
			interacting: this.readOnly ? false : {edgeMovable: false},
			// Edges are drawn by dragging a port: outputs connect to matching
			// inputs (and vice versa - direction is normalized on drop). A drop
			// on blank canvas is allowed and offers to create the counterpart
			// node there; the dangling edge is cleaned up in settleConnectDrop.
			connecting: {
				snap: {radius: CONNECT_SNAP_RADIUS},
				allowBlank: true,
				allowLoop: false,
				allowNode: true,
				allowEdge: false,
				highlight: false,
				validateMagnet: ({magnet}) => !this.readOnly && this.portInfo(this.portIdOf(magnet)) !== null,
				validateConnection: ({targetCell, targetMagnet}) =>
					this.isValidConnectTarget(targetCell ?? null, targetMagnet ?? null),
				// this.x6Graph (not the local const) - referencing the graph in
				// its own initializer would defeat type inference; by the time a
				// gesture can start, this.x6Graph is this very instance.
				createEdge: ({sourceCell, sourceMagnet}) => this.beginConnectGesture(sourceCell, sourceMagnet),
			},
			highlighting: {
				// Snap feedback: x6 marks the port the dangling end would attach to.
				magnetAdsorbed: {name: 'className', args: {className: 'pg-port-adsorbed'}},
			},
		});

		const selection = new Selection({
			enabled: true,
			multiple: true,
			multipleSelectionModifiers: ['ctrl', 'meta', 'shift'],
			rubberband: true,
			modifiers: ['shift'],
			showNodeSelectionBox: false,
			rubberEdge: false,
			filter: cell => cell.isNode(),
		});
		x6Graph.use(selection);

		x6Graph.on('selection:changed', ({selected}) => this.onSelectionChanged(x6Graph, selected));
		x6Graph.on('node:contextmenu', ({e, x, y, node}) => {
			e.preventDefault();
			this.onNodeContextMenu(e.clientX ?? 0, e.clientY ?? 0, {x, y}, node);
		});
		x6Graph.on('blank:contextmenu', ({e, x, y}) => {
			e.preventDefault();
			this.onBlankContextMenu(e.clientX ?? 0, e.clientY ?? 0, {x, y});
		});
		x6Graph.on('edge:contextmenu', ({e, x, y, edge}) => {
			e.preventDefault();
			const modelEdge = this.edgeById.get(edge.id);
			if (modelEdge) {
				this.selection?.clean();
				this.clearVertexSelection();
				this.contextMenuSubject.next({clientX: e.clientX ?? 0, clientY: e.clientY ?? 0, local: {x, y}, nodes: [], edge: modelEdge});
			}
		});
		x6Graph.on('node:dblclick', ({node}) => {
			const modelNode = this.nodeById.get(node.id);
			if (!modelNode) {
				return;
			}
			// Subplans open their inner plan; every other node opens the inspector.
			if (modelNode instanceof SubplanNode) {
				this.actions.requestSubplanOpen(modelNode.subplanId);
			} else {
				this.selectNodeById(modelNode.id);
				this.panelLayout.openPanel('inspector');
			}
		});

		x6Graph.on('node:mouseenter', ({node}) => this.applyNodeHover(node, true));
		x6Graph.on('node:mouseleave', ({node}) => this.applyNodeHover(node, false));

		// Corner handles appear while hovering an edge: drag a handle to move
		// the corner, press anywhere on the line to add one, click a handle
		// to remove it (Google-Maps-style path editing). While hovering, a
		// ghost circle previews where a pressed corner would be created - x6
		// only emits cell mousemove during a press-drag, so the ghost is
		// driven by a native mousemove listener on the container instead.
		x6Graph.on('edge:mouseenter', ({view, edge}) => {
			// The in-flight connect preview is not editable - no corner tools.
			if (this.isTempConnect(edge)) {
				return;
			}
			this.hoveredEdgeView = view;
			if (!this.readOnly) {
				edge.addTools([this.verticesTool()]);
			}
			this.applyEdgeStyle(edge, true);
		});
		x6Graph.on('edge:mouseleave', ({edge}) => {
			if (this.isTempConnect(edge)) {
				return;
			}
			this.hoveredEdgeView = null;
			edge.removeTools();
			this.applyEdgeStyle(edge, false);
			this.hideCornerPreview();
		});
		this.hoverMoveTarget?.removeEventListener('mousemove', this.edgeHoverListener);
		this.hoverMoveTarget?.removeEventListener('mouseover', this.warningOverListener);
		this.hoverMoveTarget?.removeEventListener('mouseout', this.warningOutListener);
		container.addEventListener('mousemove', this.edgeHoverListener);
		container.addEventListener('mouseover', this.warningOverListener);
		container.addEventListener('mouseout', this.warningOutListener);
		this.hoverMoveTarget = container;

		// The Selection plugin only understands cells, so edge corners caught
		// by the shift+rubberband are tracked here: the gesture's rectangle is
		// recorded from blank mousedown/mouseup and every corner inside it
		// becomes selected (highlighted, and moved along with the selection).
		x6Graph.on('blank:mousedown', ({e, x, y}) => {
			if (e.shiftKey) {
				this.rubberbandStart = {x, y};
			} else {
				this.clearVertexSelection();
			}
		});
		x6Graph.on('blank:mouseup', ({x, y}) => {
			const start = this.rubberbandStart;
			this.rubberbandStart = null;
			if (start) {
				this.selectVerticesWithin(start, {x, y});
			}
		});
		x6Graph.on('edge:change:vertices', ({edge}) => {
			const modelEdge = this.edgeById.get(edge.id);
			if (modelEdge) {
				// First change of a gesture: the model edge still holds the
				// pre-change vertices, so the snapshot taken by this event
				// captures the state before the edit.
				if (!this.vertexGestureActive) {
					this.vertexGestureActive = true;
					this.graphEditStartSubject.next();
				}
				modelEdge.vertices = edge.getVertices();
				this.graphChangedSubject.next();
			}
			if (this.selectedVertexMap.has(edge.id)) {
				this.renderVertexHighlights();
			}
		});

		this.x6Graph = x6Graph;
		this.selection = selection;
		this.selectedNodesSignal.set([]);
		this.edgeById.clear();
		this.vertexGestureActive = false;

		return x6Graph;
	}

	private verticesTool(): EdgeToolNativeItem
	{
		return {
			name: 'vertices',
			args: {
				snapRadius: 10,
				addable: true,
				removable: true,
				attrs: {
					r: 5,
					fill: '#141c28',
					stroke: SELECTED_STROKE,
					'stroke-width': 1.5,
					// Pointer advertises the click-to-remove action; the move
					// cursor appears only while actually dragging (see the
					// .x6-edge-tool-vertex rules in styles.scss).
					cursor: 'pointer',
				},
				// The stock tool removes corners on double-click; rewire each
				// handle so a plain click (press + release without dragging)
				// removes it instead.
				processHandle: (handle: VertexHandle) => {
					let moved = false;
					handle.on('change', () => {
						moved = false;
					});
					handle.on('changing', () => {
						moved = true;
					});
					handle.on('changed', args => {
						if (!moved) {
							// Deferred so the tool finishes its move-vertex
							// batch for this event before the removal runs.
							setTimeout(() => handle.trigger('remove', args));
						}
					});
				},
			},
		};
	}

	private addNode(x6Graph: X6Graph, node: Node): void
	{
		if (node instanceof SubplanNode) {
			this.addSubplanNode(x6Graph, node);
			return;
		}

		const style = this.styleFor(node);
		const size = this.sizeFor(node);
		const sloopIcon = this.sloopIconFor(node);
		// The corner icon and the glow are independent, toggleable effects.
		const sloopGlow = sloopIcon !== '' && this.settings.graph().sloopGlow;
		const cornerSloop = sloopIcon !== '' && this.settings.graph().showSloopCornerIcon ? sloopIcon : '';
		const textShift = this.textShiftFor(node);
		// Recipe and sink nodes grow with their stat rows (machine groups /
		// sinked items), so the name pins to the top (slightly larger) and the
		// bold line plus stat lines flow below it instead of the default
		// percentage-based centering. A block shorter than the minimum node
		// height shifts down to sit vertically centered.
		const labelOffset = node instanceof RecipeNode || node instanceof SinkNode
			? this.labelBlockOffset(style.stats, size.height)
			: 0;
		const recipeLabelAttrs = node instanceof RecipeNode || node instanceof SinkNode
			? {
				name: {refY: RECIPE_NAME_Y + labelOffset, fontSize: RECIPE_NAME_FONT_SIZE},
				machines: {refY: RECIPE_MACHINES_Y + labelOffset},
				stats: {
					refY: RECIPE_STATS_Y + labelOffset,
					textVerticalAnchor: 'top',
					lineHeight: RECIPE_STATS_LINE_HEIGHT,
				},
			}
			: {name: {}, machines: {}, stats: {}};
		x6Graph.addNode({
			id: node.id,
			shape: 'planner-node',
			x: node.x,
			y: node.y,
			width: size.width,
			height: size.height,
			ports: this.portsFor(node),
			attrs: {
				body: {
					fill: style.bodyFill,
					stroke: style.bodyStroke,
					strokeWidth: NODE_STROKE_WIDTH,
					rx: 5,
					ry: 5,
					// A soft somersloop-colored glow around slooped recipe nodes.
					...(sloopGlow
						? {filter: {name: 'dropShadow', args: {dx: 0, dy: 0, blur: 9, color: SLOOP_GLOW_COLOR, opacity: 0.55}}}
						: {}),
				},
				name: {text: style.name, ...recipeLabelAttrs.name, x: textShift},
				machines: {text: style.machines, ...recipeLabelAttrs.machines, x: textShift},
				stats: {text: style.stats, ...recipeLabelAttrs.stats, x: textShift},
				machineIcon: {...this.iconAttrs(this.nodeIconFor(node)), ...this.leftIconAttrs(node)},
				...this.recipeSloopBadges(node, textShift, labelOffset),
				sloop: this.iconAttrs(cornerSloop),
				// The lock drops to the second row when the sloop icon holds the top.
				lock: {...this.iconAttrs(style.lock), y: cornerSloop ? LOCK_ROW2_Y : CORNER_INSET},
				inputWarning: this.iconAttrs(style.inputWarning),
				outputWarning: this.iconAttrs(style.outputWarning),
				capacityWarning: this.iconAttrs(style.capacityWarning),
			},
		});
	}

	private addSubplanNode(x6Graph: X6Graph, node: SubplanNode): void
	{
		const style = this.baseStyleFor(node);
		const size = this.sizeFor(node);
		const attrs: Record<string, Record<string, string | number>> = {
			body: {fill: style.bodyFill, stroke: style.bodyStroke, strokeWidth: NODE_STROKE_WIDTH, rx: 5, ry: 5},
			name: {text: this.subplanDisplayName(node)},
			stats: {text: this.subplanStats(node)},
			// Subplan nodes are always locked; the lock reads as "solver won't touch me".
			lock: this.iconAttrs(this.lockIconUri),
		};
		this.applySubplanIoIcons(attrs, 'in', node.inputs);
		this.applySubplanIoIcons(attrs, 'out', node.outputs);
		x6Graph.addNode({
			id: node.id,
			shape: 'planner-subplan-node',
			x: node.x,
			y: node.y,
			width: size.width,
			height: size.height,
			ports: this.portsFor(node),
			attrs,
		});
	}

	/** Fills in{i}/out{i} icon slots and the {prefix}More overflow text for one side of a subplan node. */
	private applySubplanIoIcons(attrs: Record<string, Record<string, string | number>>, prefix: 'in' | 'out', ios: NodeIO[]): void
	{
		const show = this.settings.graph().showSubplanItemIcons;
		const shown = !show ? 0 : (ios.length <= SUBPLAN_IO_MAX ? ios.length : SUBPLAN_IO_MAX - 1);
		for (let i = 0; i < SUBPLAN_IO_MAX; i++) {
			const io = i < shown ? ios[i] : null;
			attrs[`${prefix}${i}`] = this.iconAttrs(io ? (this.iconUrls.url(io.item.icon, 64) ?? '') : '');
		}
		const more = show ? ios.length - shown : 0;
		attrs[`${prefix}More`] = {text: more > 0 ? `+${more}` : '', display: more > 0 ? 'inline' : 'none'};
	}

	/**
	 * Connection ports for a node: one per distinct input item and one per
	 * distinct output item, placed on opposite node edges following the flow
	 * direction of the plan's layout. The port id encodes side and item
	 * (`in|Desc_IronPlate_C`), which is all the connect gesture needs.
	 */
	private portsFor(node: Node): Partial<PortsMetadata>
	{
		// Ports only exist to start connect gestures - read-only graphs get none.
		if (this.readOnly) {
			return {};
		}
		const vertical = GraphLayoutDefaults.resolve(this.planManager.activePlan()?.settings.graph).direction === 'down';
		const markup = [
			{tagName: 'circle', selector: 'portBody'},
			{tagName: 'image', selector: 'portIcon'},
		];
		const attrs = {
			portBody: {
				r: PORT_RADIUS,
				magnet: true,
				fill: PORT_FILL,
				stroke: PORT_STROKE,
				strokeWidth: 1.5,
				class: 'pg-port',
			},
			portIcon: {
				width: PORT_ICON_SIZE,
				height: PORT_ICON_SIZE,
				x: -PORT_ICON_SIZE / 2,
				y: -PORT_ICON_SIZE / 2,
				class: 'pg-port pg-port-icon',
			},
		};
		return {
			groups: {
				in: {position: vertical ? 'top' : 'left', markup, attrs},
				out: {position: vertical ? 'bottom' : 'right', markup, attrs},
			},
			items: [
				...this.portItemsFor(node.inputs, 'in'),
				...this.portItemsFor(node.outputs, 'out'),
			],
		};
	}

	private portItemsFor(ios: NodeIO[], group: 'in' | 'out'): PortMetadata[]
	{
		const seen = new Set<string>();
		const items: PortMetadata[] = [];
		ios.forEach(io => {
			if (seen.has(io.item.className)) {
				return;
			}
			seen.add(io.item.className);
			items.push({
				id: `${group}|${io.item.className}`,
				group,
				attrs: {portIcon: this.iconAttrs(this.iconUrls.url(io.item.icon, 64) ?? '')},
			});
		});
		return items;
	}

	/** Decodes a port id (`in|Desc_IronPlate_C`) back into side and item. */
	private portInfo(portId: string | null): {side: 'in' | 'out'; itemClassName: string} | null
	{
		if (!portId) {
			return null;
		}
		const separator = portId.indexOf('|');
		const side = portId.slice(0, separator);
		if (separator < 0 || (side !== 'in' && side !== 'out')) {
			return null;
		}
		return {side, itemClassName: portId.slice(separator + 1)};
	}

	/** The port id a magnet element belongs to - x6 stamps it on the port's root element. */
	private portIdOf(magnet: Element | null | undefined): string | null
	{
		if (!magnet) {
			return null;
		}
		const carrier = magnet.hasAttribute('port') ? magnet : magnet.closest('[port]');
		return carrier?.getAttribute('port') ?? null;
	}

	/**
	 * Starts a connect gesture from a port: remembers where it started, shows
	 * the matching port on every node that could take the item (dimming nodes
	 * that could not), and returns the dashed preview edge x6 drags around.
	 * The gesture always settles in settleConnectDrop, driven by mouseup.
	 */
	private beginConnectGesture(sourceCell: Cell, sourceMagnet: Element): X6Edge | null
	{
		const x6Graph = this.x6Graph;
		if (!x6Graph) {
			return null;
		}
		const info = this.portInfo(this.portIdOf(sourceMagnet));
		if (info) {
			this.nodeTooltip.hide();
			this.connectGesture = {nodeId: sourceCell.id, side: info.side, itemClassName: info.itemClassName};
			this.markConnectTargets(x6Graph);
			x6Graph.container.classList.add('pg-connecting');
			this.watchConnectDrop(x6Graph);
		}
		// The arrow shows the future flow direction: dragging from an output
		// it points at the cursor (flow leaves the start node); from an input
		// it points back at the start node (flow will arrive there).
		const markers = info?.side === 'in'
			? {sourceMarker: {name: 'block', size: 7}, targetMarker: null}
			: {sourceMarker: null, targetMarker: {name: 'block', size: 7}};
		return x6Graph.createEdge({
			shape: 'edge',
			attrs: {
				line: {
					stroke: SELECTED_STROKE,
					strokeWidth: 2,
					strokeDasharray: '5 3',
					...markers,
				},
			},
			data: {tempConnect: true},
			zIndex: 1000,
		});
	}

	private isTempConnect(edge: X6Edge): boolean
	{
		return (edge.getData() as {tempConnect?: boolean} | null)?.tempConnect === true;
	}

	/** Reveals the ports that accept the dragged item; dims nodes offering none. */
	private markConnectTargets(x6Graph: X6Graph): void
	{
		const gesture = this.connectGesture;
		if (!gesture) {
			return;
		}
		const wantedSide = gesture.side === 'out' ? 'in' : 'out';
		this.nodeById.forEach((node, id) => {
			if (id === gesture.nodeId) {
				return;
			}
			const cell = x6Graph.getCellById(id);
			if (!cell || !cell.isNode()) {
				return;
			}
			const ios = wantedSide === 'in' ? node.inputs : node.outputs;
			const accepts = ios.some(io => io.item.className === gesture.itemClassName)
				&& !this.hasEdgeBetween(id, gesture);
			if (accepts) {
				const portId = `${wantedSide}|${gesture.itemClassName}`;
				cell.portProp(portId, 'attrs/portBody/class', 'pg-port pg-port-available');
				cell.portProp(portId, 'attrs/portIcon/class', 'pg-port pg-port-icon pg-port-available');
				this.markedPorts.push({cell, portId});
			} else {
				x6Graph.findViewByCell(cell)?.container.classList.add('pg-node-dim');
				this.dimmedNodeIds.push(id);
			}
		});
	}

	private endConnectGesture(x6Graph: X6Graph): void
	{
		this.connectGesture = null;
		this.hideCornerPreview();
		x6Graph.container.classList.remove('pg-connecting');
		this.markedPorts.forEach(({cell, portId}) => {
			cell.portProp(portId, 'attrs/portBody/class', 'pg-port');
			cell.portProp(portId, 'attrs/portIcon/class', 'pg-port pg-port-icon');
		});
		this.markedPorts = [];
		this.dimmedNodeIds.forEach(id => {
			const cell = x6Graph.getCellById(id);
			if (cell) {
				x6Graph.findViewByCell(cell)?.container.classList.remove('pg-node-dim');
			}
		});
		this.dimmedNodeIds = [];
	}

	/**
	 * x6 has no single "gesture over" event covering connected, dangling and
	 * cancelled drops alike, so the gesture settles on the next macrotask
	 * after mouseup - by then x6 has finished connecting or reverting.
	 */
	private watchConnectDrop(x6Graph: X6Graph): void
	{
		const onUp = (event: MouseEvent): void => {
			document.removeEventListener('mouseup', onUp, true);
			const client = {x: event.clientX, y: event.clientY};
			setTimeout(() => this.settleConnectDrop(x6Graph, client));
		};
		document.addEventListener('mouseup', onUp, true);
	}

	/**
	 * Runs once the drop settled: the preview edge either connected to a node
	 * (create the model edge), dangles on blank canvas (offer creating the
	 * counterpart node there), or is gone (cancelled). The preview edge never
	 * survives - the model edge arrives through the component re-render.
	 */
	private settleConnectDrop(x6Graph: X6Graph, client: {x: number; y: number}): void
	{
		const gesture = this.connectGesture;
		this.endConnectGesture(x6Graph);
		if (this.x6Graph !== x6Graph) {
			return;
		}

		const temp = x6Graph.getEdges().find(edge => this.isTempConnect(edge));
		if (!temp || !gesture) {
			if (temp) {
				x6Graph.removeCell(temp);
			}
			return;
		}
		const targetCellId = temp.getTargetCellId();
		const targetPoint = targetCellId ? null : temp.getTargetPoint();
		x6Graph.removeCell(temp);

		if (targetCellId) {
			const request = this.edgeRequestFor(gesture, targetCellId, client);
			if (request) {
				this.actions.requestEdgeAdd(request);
			}
			return;
		}
		if (targetPoint) {
			// A drop over an incompatible node also leaves a dangling edge -
			// only a genuinely blank spot offers to create the counterpart.
			if (x6Graph.getNodesFromPoint(targetPoint.x, targetPoint.y).length > 0) {
				return;
			}
			this.actions.requestConnectToBlank({
				nodeId: gesture.nodeId,
				itemClassName: gesture.itemClassName,
				side: gesture.side === 'out' ? 'output' : 'input',
				position: {x: targetPoint.x, y: targetPoint.y},
			});
		}
	}

	/** The model edge a finished gesture asks for, normalized to flow direction. */
	private edgeRequestFor(gesture: PortConnectGesture, droppedOnId: string, client: {x: number; y: number}): GraphEdgeAddRequest | null
	{
		if (!this.nodeById.has(droppedOnId) || droppedOnId === gesture.nodeId || this.hasEdgeBetween(droppedOnId, gesture)) {
			return null;
		}
		return {
			sourceId: gesture.side === 'out' ? gesture.nodeId : droppedOnId,
			targetId: gesture.side === 'out' ? droppedOnId : gesture.nodeId,
			itemClassName: gesture.itemClassName,
			clientX: client.x,
			clientY: client.y,
		};
	}

	/** One edge per source/target/item - connecting the same pair again is blocked. */
	private hasEdgeBetween(otherNodeId: string, gesture: PortConnectGesture): boolean
	{
		const sourceId = gesture.side === 'out' ? gesture.nodeId : otherNodeId;
		const targetId = gesture.side === 'out' ? otherNodeId : gesture.nodeId;
		for (const edge of this.edgeById.values()) {
			if (edge.sourceId === sourceId && edge.targetId === targetId && edge.itemClassName === gesture.itemClassName) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Live validation while dragging: the drop target must be another node
	 * that exchanges the dragged item on the opposite side and is not already
	 * connected for it. A drop on a specific port must be the matching one; a
	 * drop on the node body is accepted whenever some port would match.
	 */
	private isValidConnectTarget(targetCell: Cell | null, targetMagnet: Element | null): boolean
	{
		const gesture = this.connectGesture;
		if (!gesture || !targetCell || !targetCell.isNode() || targetCell.id === gesture.nodeId) {
			return false;
		}
		const node = this.nodeById.get(targetCell.id);
		if (!node || this.hasEdgeBetween(targetCell.id, gesture)) {
			return false;
		}
		const wantedSide = gesture.side === 'out' ? 'in' : 'out';
		const portInfo = this.portInfo(this.portIdOf(targetMagnet));
		if (portInfo) {
			return portInfo.side === wantedSide && portInfo.itemClassName === gesture.itemClassName;
		}
		const ios = wantedSide === 'in' ? node.inputs : node.outputs;
		return ios.some(io => io.item.className === gesture.itemClassName);
	}

	private addEdge(x6Graph: X6Graph, edge: GraphEdge, index: number): void
	{
		const label = this.labelTextFor(edge);
		const size = this.labelSizeFor(label);
		const id = `edge-${index}`;
		this.edgeById.set(id, edge);
		const hasIcon = label.iconUrl !== null && this.settings.graph().showEdgeItemIcons;
		const textShift = hasIcon ? (EDGE_ICON_SIZE + EDGE_ICON_GAP) / 2 : 0;

		x6Graph.addEdge({
			id,
			source: edge.sourceId,
			target: edge.targetId,
			attrs: {
				line: {
					stroke: EDGE_STROKE,
					strokeWidth: EDGE_STROKE_WIDTH,
				},
			},
			labels: [{
				markup: [
					{tagName: 'rect', selector: 'rect'},
					{tagName: 'image', selector: 'icon'},
					{tagName: 'text', selector: 'text'},
				],
				position: {distance: edge.labelDistance ?? 0.5},
				attrs: {
					text: {
						text: `${label.name}\n${label.rate}`,
						fill: '#dde4ef',
						fontSize: LABEL_FONT_SIZE,
						lineHeight: LABEL_LINE_HEIGHT,
						textAnchor: 'middle',
						textVerticalAnchor: 'middle',
						x: textShift,
					},
					// The flowing item's icon, pinned just inside the left edge
					// of the label rect and vertically centered; zero-sized when
					// the item has no icon so only the text shows.
					icon: hasIcon
						? {
							'xlink:href': label.iconUrl,
							width: EDGE_ICON_SIZE,
							height: EDGE_ICON_SIZE,
							x: -size.width / 2 + 6,
							y: -EDGE_ICON_SIZE / 2,
						}
						: {'xlink:href': '', width: 0, height: 0},
					// The default label rect is sized from the measured text
					// bbox, which drifts with font metrics and load timing.
					// Give it the same explicit size the layout reserved,
					// centered on the label point like the text is.
					rect: {
						ref: null,
						refX: null,
						refY: null,
						refWidth: null,
						refHeight: null,
						x: -size.width / 2,
						y: -size.height / 2,
						width: size.width,
						height: size.height,
						fill: '#141c28',
						stroke: '#2e3d52',
						strokeWidth: 1,
						rx: 4,
						ry: 4,
					},
				},
			}],
			...(edge.vertices && edge.vertices.length > 0 ? {
				vertices: [...edge.vertices],
				router: {name: 'normal'},
				connector: {name: 'normal'},
			} : {}),
		});
	}

	private itemFor(edge: GraphEdge): Item | null
	{
		return this.versionManager.activeVersionData()?.searchItemByClassName(edge.itemClassName) ?? null;
	}

	private labelTextFor(edge: GraphEdge): {name: string; rate: string; iconUrl: string | null}
	{
		const item = this.itemFor(edge);
		return {
			name: item?.name ?? edge.itemClassName,
			rate: this.rateFormatter.rate(edge.amount, item),
			iconUrl: this.iconUrls.url(item?.icon ?? null, 64),
		};
	}

	private labelSizeFor(label: {name: string; rate: string; iconUrl: string | null}): {width: number; height: number}
	{
		const chars = Math.max(label.name.length, label.rate.length);
		const iconWidth = label.iconUrl ? EDGE_ICON_SIZE + EDGE_ICON_GAP : 0;
		return {
			width: chars * LABEL_CHAR_WIDTH + LABEL_PADDING_X + iconWidth,
			height: LABEL_HEIGHT,
		};
	}

	private onSelectionChanged(x6Graph: X6Graph, selected: Cell[]): void
	{
		const selectedIds = new Set(selected.filter(cell => cell.isNode()).map(cell => cell.id));

		x6Graph.getNodes().forEach(cell => {
			const modelNode = this.nodeById.get(cell.id);
			if (selectedIds.has(cell.id)) {
				cell.attr('body/stroke', SELECTED_STROKE);
				cell.attr('body/strokeWidth', SELECTED_STROKE_WIDTH);
			} else if (modelNode) {
				cell.attr('body/stroke', this.styleFor(modelNode).bodyStroke);
				cell.attr('body/strokeWidth', NODE_STROKE_WIDTH);
			}
		});

		x6Graph.getEdges().forEach(edge => this.applyEdgeStyle(edge, false));

		this.vertexDragAnchorId = selected.find(cell => cell.isNode())?.id ?? null;

		const selectedNodes: Node[] = [];
		selectedIds.forEach(id => {
			const modelNode = this.nodeById.get(id);
			if (modelNode) {
				selectedNodes.push(modelNode);
			}
		});
		this.selectedNodesSignal.set(selectedNodes);
	}

	/** Replaces the corner selection with all edge corners inside the rectangle. */
	private selectVerticesWithin(a: GraphPoint, b: GraphPoint): void
	{
		if (!this.x6Graph) {
			return;
		}
		const minX = Math.min(a.x, b.x);
		const maxX = Math.max(a.x, b.x);
		const minY = Math.min(a.y, b.y);
		const maxY = Math.max(a.y, b.y);

		this.selectedVertexMap.clear();
		this.x6Graph.getEdges().forEach(edge => {
			const indices = edge.getVertices()
				.map((vertex, index) => vertex.x >= minX && vertex.x <= maxX && vertex.y >= minY && vertex.y <= maxY ? index : -1)
				.filter(index => index >= 0);
			if (indices.length > 0) {
				this.selectedVertexMap.set(edge.id, indices);
			}
		});
		this.renderVertexHighlights();
	}

	private clearVertexSelection(): void
	{
		this.selectedVertexMap.clear();
		this.rubberbandStart = null;
		this.vertexHighlights.forEach(circle => circle.remove());
		this.vertexHighlights = [];
	}

	/** Marks selected corners with the same circle the hover handles use. */
	private renderVertexHighlights(): void
	{
		this.vertexHighlights.forEach(circle => circle.remove());
		this.vertexHighlights = [];
		if (!this.x6Graph) {
			return;
		}
		this.selectedVertexMap.forEach((indices, edgeId) => {
			const edge = this.x6Graph!.getCellById(edgeId);
			if (!edge?.isEdge()) {
				return;
			}
			const vertices = edge.getVertices();
			indices.forEach(index => {
				const vertex = vertices[index];
				if (!vertex) {
					return;
				}
				const circle = this.createHandleCircle();
				circle.setAttribute('cx', String(vertex.x));
				circle.setAttribute('cy', String(vertex.y));
				this.x6Graph!.view.decorator.appendChild(circle);
				this.vertexHighlights.push(circle);
			});
		});
	}

	/**
	 * Makes a selection drag move exactly the selected corners. x6 itself
	 * translates ALL vertices of any edge touching a selected node, so on
	 * touched edges the unselected corners get the delta subtracted back,
	 * while selected corners on untouched edges get it added. Both are pure
	 * additions, so this composes with x6's translation in either event
	 * order within the drag tick.
	 */
	private applySelectionDragToVertices(dx: number, dy: number): void
	{
		if (!this.x6Graph || this.selectedVertexMap.size === 0) {
			return;
		}
		this.x6Graph.getEdges().forEach(edge => {
			const selectedIndices = new Set(this.selectedVertexMap.get(edge.id) ?? []);
			const touched = this.isEdgeTouchingSelection(edge);
			const vertices = edge.getVertices();
			let changed = false;
			vertices.forEach((vertex, index) => {
				if (touched && !selectedIndices.has(index)) {
					vertices[index] = {x: vertex.x - dx, y: vertex.y - dy};
					changed = true;
				} else if (!touched && selectedIndices.has(index)) {
					vertices[index] = {x: vertex.x + dx, y: vertex.y + dy};
					changed = true;
				}
			});
			if (changed) {
				edge.setVertices(vertices);
			}
		});
	}

	private isEdgeTouchingSelection(edge: X6Edge): boolean
	{
		const selection = this.selection;
		return selection !== null
			&& (selection.isSelected(edge.getSourceCellId()) || selection.isSelected(edge.getTargetCellId()));
	}

	private onEdgeHoverMove(e: MouseEvent): void
	{
		// Read-only edges have no corner handles, so no ghost corner either.
		if (this.readOnly || !this.hoveredEdgeView || !this.x6Graph) {
			return;
		}
		const point = this.x6Graph.clientToLocal(e.clientX, e.clientY);
		this.moveCornerPreview(this.hoveredEdgeView, point.x, point.y);
	}

	/**
	 * Ghost corner following the cursor along the hovered edge, previewing
	 * where pressing the line would create a corner. Hidden near existing
	 * corner handles, where pressing grabs the handle instead.
	 */
	private moveCornerPreview(view: EdgeView, x: number, y: number): void
	{
		if (!this.x6Graph) {
			return;
		}

		const point = view.path.closestPoint({x, y});
		const nearHandle = view.cell.getVertices()
			.some(vertex => Math.hypot(vertex.x - point.x, vertex.y - point.y) < CORNER_PREVIEW_SNAP);
		if (nearHandle) {
			this.hideCornerPreview();
			return;
		}

		if (!this.cornerPreview) {
			const circle = this.createHandleCircle();
			circle.setAttribute('opacity', '0.6');
			this.x6Graph.view.decorator.appendChild(circle);
			this.cornerPreview = circle;
		}
		this.cornerPreview.setAttribute('cx', String(point.x));
		this.cornerPreview.setAttribute('cy', String(point.y));
	}

	private hideCornerPreview(): void
	{
		this.cornerPreview?.remove();
		this.cornerPreview = null;
	}

	/**
	 * A circle matching the vertices tool's corner handles, drawn in the
	 * decorator layer (so it pans/zooms with the graph). Purely visual -
	 * pointer events must reach the edge line and handles underneath.
	 */
	private createHandleCircle(): SVGCircleElement
	{
		const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		circle.setAttribute('r', '5');
		circle.setAttribute('fill', '#141c28');
		circle.setAttribute('stroke', SELECTED_STROKE);
		circle.setAttribute('stroke-width', '1.5');
		circle.style.pointerEvents = 'none';
		return circle;
	}

	/** Applies the edge line style by priority: selection > hover > base. */
	private applyEdgeStyle(edge: X6Edge, hovered: boolean): void
	{
		const selection = this.selection;
		const highlighted = selection !== null
			&& (selection.isSelected(edge.getSourceCellId()) || selection.isSelected(edge.getTargetCellId()));

		if (highlighted) {
			edge.attr('line/stroke', SELECTED_STROKE);
			edge.attr('line/strokeWidth', SELECTED_EDGE_STROKE_WIDTH);
		} else if (hovered) {
			edge.attr('line/stroke', HOVER_EDGE_STROKE);
			edge.attr('line/strokeWidth', HOVER_EDGE_STROKE_WIDTH);
		} else {
			edge.attr('line/stroke', EDGE_STROKE);
			edge.attr('line/strokeWidth', EDGE_STROKE_WIDTH);
		}
	}

	private applyNodeHover(cell: Cell, hovered: boolean): void
	{
		if (this.selection?.isSelected(cell)) {
			return;
		}
		cell.attr('body/strokeWidth', hovered ? HOVER_NODE_STROKE_WIDTH : NODE_STROKE_WIDTH);
	}

	private onNodeContextMenu(clientX: number, clientY: number, local: GraphPoint, cell: Cell): void
	{
		const selection = this.selection;
		if (!selection) {
			return;
		}

		// Right-clicking outside the current selection re-targets it, the
		// same way file managers do; right-clicking inside keeps the group.
		if (!selection.isSelected(cell)) {
			selection.reset(cell);
		}

		const nodes = selection.cells
			.map(selectedCell => this.nodeById.get(selectedCell.id))
			.filter((node): node is Node => node !== undefined);

		this.contextMenuSubject.next({clientX, clientY, local, nodes});
	}

	private onBlankContextMenu(clientX: number, clientY: number, local: GraphPoint): void
	{
		this.selection?.clean();
		this.clearVertexSelection();
		this.contextMenuSubject.next({clientX, clientY, local, nodes: []});
	}

	private trackNodeMoves(x6Graph: X6Graph, nodes: Node[]): void
	{
		this.nodeById.clear();
		nodes.forEach(node => this.nodeById.set(node.id, node));

		// node:change:position (rather than node:moved) also covers nodes
		// dragged as part of a multi-node selection.
		x6Graph.on('node:change:position', ({node, current, previous}) => {
			const modelNode = this.nodeById.get(node.id);
			if (modelNode) {
				const position = node.getPosition();
				modelNode.x = position.x;
				modelNode.y = position.y;
				this.graphChangedSubject.next();
			}
			// Every node of a selection drag moves by the same delta each
			// tick, so the anchor's delta is applied to the corner selection
			// exactly once per tick.
			if (node.id === this.vertexDragAnchorId && current && previous) {
				this.applySelectionDragToVertices(current.x - previous.x, current.y - previous.y);
			}
		});
	}

	private elkEdgeVertices(edge: ElkExtendedEdge): GraphPoint[]
	{
		const points: GraphPoint[] = [];
		(edge.sections ?? []).forEach((section, i) => {
			if (i > 0) points.push(section.startPoint);
			(section.bendPoints ?? []).forEach(pt => points.push(pt));
		});
		return points;
	}

	/**
	 * Converts ELK's absolute inline-label position into a 0–1 ratio along
	 * the edge route, which is how x6 positions edge labels. The label
	 * center lies on the route (inline placement), so projecting it onto
	 * the polyline is exact up to node-boundary clipping differences.
	 */
	private elkLabelDistance(edge: ElkExtendedEdge): number
	{
		const label = edge.labels?.[0];
		const points: GraphPoint[] = [];
		(edge.sections ?? []).forEach(section => {
			points.push(section.startPoint);
			(section.bendPoints ?? []).forEach(pt => points.push(pt));
			points.push(section.endPoint);
		});
		if (!label || points.length < 2) {
			return 0.5;
		}

		const center = {
			x: (label.x ?? 0) + (label.width ?? 0) / 2,
			y: (label.y ?? 0) + (label.height ?? 0) / 2,
		};

		let total = 0;
		let bestDistance = Infinity;
		let bestAt = 0;
		for (let i = 0; i < points.length - 1; i++) {
			const a = points[i];
			const b = points[i + 1];
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const length = Math.hypot(dx, dy);
			const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((center.x - a.x) * dx + (center.y - a.y) * dy) / (length * length)));
			const distance = Math.hypot(center.x - (a.x + t * dx), center.y - (a.y + t * dy));
			if (distance < bestDistance) {
				bestDistance = distance;
				bestAt = total + t * length;
			}
			total += length;
		}
		return total === 0 ? 0.5 : bestAt / total;
	}

	private styleFor(node: Node): NodeStyle
	{
		let style = this.baseStyleFor(node);
		if (node.locked) {
			style = {...style, lock: this.lockIconUri};
		}
		const warnings = this.warningsById.get(node.id);
		if (warnings) {
			style = {
				...style,
				bodyStroke: '#d4663f',
				inputWarning: warnings.inputs.length > 0 ? this.warningIconUri : '',
				outputWarning: warnings.outputs.length > 0 ? this.warningIconUri : '',
				capacityWarning: warnings.capacity !== null ? this.warningIconUri : '',
			};
		}
		return style;
	}

	/** Renders a FontAwesome icon as an SVG data URI for use in x6 image elements. */
	private iconDataUri(icon: IconDefinition, color: string): string
	{
		const [width, height, , , path] = icon.icon;
		const d = Array.isArray(path) ? path.join(' ') : path;
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="${color}" d="${d}"/></svg>`;
		return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
	}

	private iconAttrs(uri: string): {'xlink:href': string; display: string}
	{
		return {'xlink:href': uri, display: uri ? 'inline' : 'none'};
	}

	/**
	 * The node's own top-left icon: the producing machine for recipe/generator
	 * nodes, the item itself for the IO nodes (mine, input, product, byproduct);
	 * '' for nodes without one.
	 */
	private nodeIconFor(node: Node): string
	{
		const graph = this.settings.graph();
		let hash: string | null = null;
		if (node instanceof RecipeNode) {
			hash = graph.showNodeBuildingIcons ? node.machine.icon : null;
		} else if (node instanceof GeneratorNode) {
			hash = graph.showNodeBuildingIcons ? node.generator.icon : null;
		} else if (node instanceof SinkNode) {
			// Sink nodes render recipe-style (name + points + item line), no left icon.
			hash = null;
		} else if (node instanceof ItemAmountNode) {
			hash = graph.showNodeItemIcons ? node.item.icon : null;
		}
		return this.iconUrls.url(hash, 64) ?? '';
	}

	/** The subplan's shown name - the derived name of its plan, falling back to the node's stored name. */
	private subplanDisplayName(node: SubplanNode): string
	{
		const plan = this.planManager.plans().find(candidate => candidate.id === node.subplanId);
		return plan ? this.planNames.displayName(plan) : node.getDisplayName();
	}

	/** Nodes that carry a left-side icon (machine, generator or the IO item itself). */
	private hasLeftIcon(node: Node): boolean
	{
		return this.nodeIconFor(node) !== '';
	}

	/** How far the label text is nudged right to clear the left icon (0 when there is none). */
	private textShiftFor(node: Node): number
	{
		return this.hasLeftIcon(node) ? TEXT_SHIFT : 0;
	}

	/** The larger, vertically-centered left icon shared by machine and IO nodes. */
	private leftIconAttrs(node: Node): Record<string, number> | Record<string, never>
	{
		if (!this.hasLeftIcon(node)) {
			return {};
		}
		return {
			refY: 0.5,
			y: -LEFT_ICON_SIZE / 2,
			x: LEFT_ICON_X,
			width: LEFT_ICON_SIZE,
			height: LEFT_ICON_SIZE,
		};
	}

	/**
	 * Somersloop badge slots: for each slooped machine-group stat line, an icon
	 * placed just past the line's "+K", so the icon reads as the unit (replacing
	 * the old "S"). Empty for non-recipe or unslooped nodes.
	 */
	private recipeSloopBadges(node: Node, textShift: number, labelOffset = 0): Record<string, Record<string, string | number>>
	{
		// Decimal machine display shows no group lines to badge; the corner
		// sloop icon and glow still mark the node as slooped.
		if (!(node instanceof RecipeNode) || this.settings.graph().machineDisplay === 'decimal') {
			return {};
		}
		const url = this.sloopIconFor(node);
		if (!url) {
			return {};
		}
		const badges: Record<string, Record<string, string | number>> = {};
		node.groups.forEach((group, i) => {
			if (group.sloops <= 0 || i >= STAT_SLOOP_MAX_LINES) {
				return;
			}
			const lineWidth = this.groupStatLine(group).length * RECIPE_STATS_CHAR_WIDTH;
			badges[`statSloop${i}`] = {
				'xlink:href': url,
				display: 'inline',
				// The stat line centers at nodeCenter + textShift; the badge follows its right edge.
				x: textShift + lineWidth / 2 + STAT_SLOOP_GAP,
				y: RECIPE_STATS_Y + labelOffset + i * RECIPE_STATS_LINE_HEIGHT + STAT_SLOOP_CENTER_OFFSET - STAT_SLOOP_SIZE / 2,
			};
		});
		return badges;
	}

	/** Somersloop icon URL for a recipe node with sloops slotted; '' otherwise. */
	private sloopIconFor(node: Node): string
	{
		if (!(node instanceof RecipeNode) || !node.groups.some(group => group.sloops > 0)) {
			return '';
		}
		const hash = this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.SomersloopItem) ?? null;
		return this.iconUrls.url(hash, 64) ?? '';
	}

	private sizeFor(node: Node): {width: number; height: number}
	{
		if (node instanceof SubplanNode) {
			return {width: GraphMetrics.SUBPLAN_NODE_WIDTH, height: GraphMetrics.SUBPLAN_NODE_HEIGHT};
		}
		if (node instanceof RecipeNode) {
			const stats = this.recipeStats(node);
			// Slooped stat lines carry a badge past their text; reserve room for it.
			const sloopExtra = stats !== '' && node.groups.some(group => group.sloops > 0) ? STAT_SLOOP_SIZE + STAT_SLOOP_GAP : 0;
			return this.statLinesSize(node.getDisplayName(), this.machinesLine(node), stats, sloopExtra, this.horizontalPadding(node));
		}
		if (node instanceof SinkNode) {
			return this.statLinesSize(node.getDisplayName(), this.sinkPointsLine(node), this.sinkStats(node));
		}
		// Generator and IO nodes have a left icon too, so they grow to keep the
		// text clear of it (their labels are name + a single stat line).
		if (this.hasLeftIcon(node)) {
			const style = this.baseStyleFor(node);
			const textWidth = Math.max(
				style.name.length * RECIPE_BOLD_CHAR_WIDTH,
				style.stats.length * RECIPE_STATS_CHAR_WIDTH,
			);
			const width = Math.min(RECIPE_MAX_WIDTH, Math.max(NODE_WIDTH, Math.ceil(TEXT_LEFT_INSET + textWidth + TEXT_RIGHT_PAD)));
			return {width, height: NODE_HEIGHT};
		}
		return {width: NODE_WIDTH, height: NODE_HEIGHT};
	}

	/** Left/right horizontal padding around the label - wider on the left when a left icon must be cleared. */
	private horizontalPadding(node: Node): number
	{
		return this.hasLeftIcon(node) ? TEXT_LEFT_INSET + TEXT_RIGHT_PAD : RECIPE_TEXT_PADDING_X;
	}

	/** Node box sized for the top-pinned label layout: name, bold line, one stat line each. */
	private statLinesSize(name: string, boldLine: string, stats: string, statsExtra = 0, horizontalPadding = RECIPE_TEXT_PADDING_X): {width: number; height: number}
	{
		const lines = stats === '' ? [] : stats.split('\n');
		const height = Math.max(NODE_HEIGHT, RECIPE_STATS_Y + RECIPE_STATS_LINE_HEIGHT * lines.length + RECIPE_BOTTOM_PADDING);
		const textWidth = Math.max(
			name.length * RECIPE_NAME_CHAR_WIDTH,
			boldLine.length * RECIPE_BOLD_CHAR_WIDTH,
			...lines.map(line => line.length * RECIPE_STATS_CHAR_WIDTH + statsExtra),
		);
		const width = Math.min(RECIPE_MAX_WIDTH, Math.max(NODE_WIDTH, Math.ceil(textWidth + horizontalPadding)));
		return {width, height};
	}

	private baseStyleFor(node: Node): NodeStyle
	{
		// Colours come from settings: the accent is the border, the fill is a
		// darkened version of it. The rest of the style (labels) is per type.
		const accent = this.accentColor(node);
		const colors = {bodyFill: this.darken(accent), bodyStroke: accent};
		const icons = {lock: '', inputWarning: '', outputWarning: '', capacityWarning: ''};

		if (node instanceof SubplanNode) {
			return {...colors, name: node.getDisplayName(), stats: this.subplanStats(node), machines: '', ...icons};
		}
		if (node instanceof RecipeNode) {
			return {...colors, name: node.getDisplayName(), stats: this.recipeStats(node), machines: this.machinesLine(node), ...icons};
		}
		if (node instanceof GeneratorNode) {
			return {...colors, name: node.getDisplayName(), stats: this.generatorStats(node), machines: '', ...icons};
		}
		if (node instanceof SinkNode) {
			return {...colors, name: node.getDisplayName(), machines: this.sinkPointsLine(node), stats: this.sinkStats(node), ...icons};
		}
		if (node instanceof MineNode) {
			return {...colors, name: node.getDisplayName(), stats: this.ioStats('Resource', node.amount, node.item), machines: '', ...icons};
		}
		if (node instanceof InputNode) {
			return {...colors, name: node.getDisplayName(), stats: this.ioStats('Input', node.amount, node.item), machines: '', ...icons};
		}
		if (node instanceof ProductNode) {
			return {...colors, name: node.getDisplayName(), stats: this.ioStats('Product', node.amount, node.item), machines: '', ...icons};
		}
		if (node instanceof ByproductNode) {
			return {...colors, name: node.getDisplayName(), stats: this.ioStats('Byproduct', node.amount, node.item), machines: '', ...icons};
		}
		return {...colors, name: '?', machines: '', stats: this.rateFormatter.amount(node.amount), ...icons};
	}

	/**
	 * The node's accent colour from settings. Recipe nodes may be coloured by
	 * their machine when per-machine colouring is on and that machine has an
	 * override; otherwise every type uses its configured colour.
	 */
	private accentColor(node: Node): string
	{
		const colors = this.settings.graph().nodeColors;
		if (node instanceof RecipeNode) {
			// Per-machine overrides are a per-plan setting (version-specific);
			// machines without an override use the default recipe colour.
			const custom = this.planManager.activePlan()?.settings.graph?.machineColors?.[node.machine.className];
			return custom ?? colors.recipe;
		}
		if (node instanceof GeneratorNode) return colors.generator;
		if (node instanceof SinkNode) return colors.sink;
		if (node instanceof MineNode) return colors.mine;
		if (node instanceof InputNode) return colors.input;
		if (node instanceof ProductNode) return colors.product;
		if (node instanceof ByproductNode) return colors.byproduct;
		if (node instanceof SubplanNode) return colors.subplan;
		return '#666666';
	}

	/** A very dark version of the accent, used as the node body fill. */
	private darken(hex: string, factor = 0.2): string
	{
		const clean = hex.replace('#', '');
		const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
		const channel = (offset: number): string => {
			const value = parseInt(full.slice(offset, offset + 2), 16);
			const scaled = Math.round(Math.max(0, Math.min(255, (Number.isNaN(value) ? 0 : value) * factor)));
			return scaled.toString(16).padStart(2, '0');
		};
		return `#${channel(0)}${channel(2)}${channel(4)}`;
	}

	/**
	 * Hover tooltips on the per-node lock and ⚠ indicators, via delegated
	 * container listeners: x6 renders cell views through an async scheduler,
	 * so the indicator elements may not exist yet right after restore() -
	 * delegation sidesteps the timing entirely (and survives re-renders).
	 */
	private onWarningHover(event: MouseEvent): void
	{
		const port = (event.target as Element | null)?.closest?.('[port]');
		if (port) {
			// No tooltip mid-gesture - it would chase the dragged edge end.
			if (!this.connectGesture) {
				this.showPortTooltip(port);
			}
			return;
		}
		const indicator = (event.target as Element | null)?.closest?.('.pn-lock, .pn-input-warning, .pn-output-warning, .pn-capacity-warning');
		if (!indicator) {
			return;
		}
		const cellId = indicator.closest('g[data-cell-id]')?.getAttribute('data-cell-id');
		const node = cellId ? this.nodeById.get(cellId) : null;
		if (!node) {
			return;
		}

		let content: NodeTooltipContent;
		if (indicator.classList.contains('pn-lock')) {
			content = this.lockTooltipFor(node);
		} else {
			const warnings = cellId ? this.warningsById.get(cellId) : null;
			if (!warnings) {
				return;
			}
			if (indicator.classList.contains('pn-capacity-warning')) {
				content = {
					title: `${node.getDisplayName()} - machines`,
					lines: warnings.capacity !== null ? [this.capacityWarningLine(warnings.capacity)] : [],
				};
			} else {
				content = indicator.classList.contains('pn-input-warning')
					? {
						title: `${node.getDisplayName()} - input`,
						lines: warnings.inputs.map(warning => this.inputWarningLine(warning.itemClassName, warning.required, warning.supplied)),
					}
					: {
						title: `${node.getDisplayName()} - output`,
						lines: warnings.outputs.map(warning => this.outputWarningLine(warning.itemClassName, warning.produced, warning.consumed)),
					};
			}
			if (content.lines.length === 0) {
				return;
			}
		}
		const box = indicator.getBoundingClientRect();
		this.nodeTooltip.show(content, box.right + 8, box.top - 4);
	}

	private onWarningOut(event: MouseEvent): void
	{
		if ((event.target as Element | null)?.closest?.('.pn-lock, .pn-input-warning, .pn-output-warning, .pn-capacity-warning, [port]')) {
			this.nodeTooltip.hide();
		}
	}

	/** Port tooltip: the item and how much of its flow is still unconnected on this side. */
	private showPortTooltip(portElement: Element): void
	{
		const info = this.portInfo(portElement.getAttribute('port'));
		const cellId = portElement.closest('g[data-cell-id]')?.getAttribute('data-cell-id');
		const node = cellId ? this.nodeById.get(cellId) : null;
		if (!info || !node) {
			return;
		}
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(info.itemClassName) ?? null;
		const graph: Graph = {nodes: [...this.nodeById.values()], edges: [...this.edgeById.values()]};
		const line = info.side === 'out'
			? `${this.rateFormatter.rate(this.reconciler.spareOutput(graph, node.id, info.itemClassName), item)} unallocated - drag to connect to a consumer.`
			: `${this.rateFormatter.rate(this.reconciler.remainingDemand(graph, node.id, info.itemClassName), item)} unsupplied - drag to connect to a producer.`;
		const box = portElement.getBoundingClientRect();
		this.nodeTooltip.show({title: item?.name ?? info.itemClassName, lines: [line]}, box.right + 8, box.top - 4);
	}

	private lockTooltipFor(node: Node): NodeTooltipContent
	{
		if (node instanceof SubplanNode) {
			return {
				title: `${node.getDisplayName()} - locked`,
				lines: [
					'Subplan nodes are always locked: the solver connects to their inputs and outputs but never changes what is inside.',
					'Double-click the node to open and edit the subplan.',
				],
			};
		}
		return {
			title: `${node.getDisplayName()} - locked`,
			lines: [
				'This node is user-owned: the solver builds around it and never replaces or rebalances it.',
				'Unlock it from the right-click menu or the Inspector.',
			],
		};
	}

	private inputWarningLine(itemClassName: string, required: number, supplied: number): string
	{
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(itemClassName) ?? null;
		const name = item?.name ?? itemClassName;
		return `${name} - needs ${this.rateFormatter.rate(required, item)}, receiving ${this.rateFormatter.rate(supplied, item)}`;
	}

	/** Clock-precision percentage (4 decimals) - a shortfall of a single 0.0001% clock step must read as more than "100%". */
	private capacityWarningLine(warning: GraphNodeCapacityWarning): string
	{
		return `Not enough machines to reach the target: needs ${this.rateFormatter.clock(warning.target / warning.capacity * 100)}% `
			+ 'of the built capacity. Add machines or raise clock speeds.';
	}

	private outputWarningLine(itemClassName: string, produced: number, consumed: number): string
	{
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(itemClassName) ?? null;
		const name = item?.name ?? itemClassName;
		if (produced > consumed) {
			return `${name} - ${this.rateFormatter.rate(produced - consumed, item)} unconsumed`;
		}
		return `${name} - sending ${this.rateFormatter.rate(consumed, item)}, producing only ${this.rateFormatter.rate(produced, item)}`;
	}

	private generatorStats(node: GeneratorNode): string
	{
		return `${this.rateFormatter.amount(node.amount)}× (${node.fuel.item.name}) - ${this.rateFormatter.power(node.powerProduction())}`;
	}

	/** IO node stat line: the node's role (Product, Byproduct, …) and its rate. */
	private ioStats(role: string, amount: number, item: Item): string
	{
		return `${role} · ${this.rateFormatter.rate(amount, item)}`;
	}

	private subplanStats(node: SubplanNode): string
	{
		if (node.inputs.length === 0 && node.outputs.length === 0) {
			return 'Subplan - empty';
		}
		return `Subplan - ${node.inputs.length} in, ${node.outputs.length} out`;
	}

	/**
	 * Bold machine line between the recipe name and the group lines, per the
	 * configured machine display: the built total (default), the exact
	 * fractional machine count at the recipe's configured clock ("3.85× Constructor
	 * @ 150%"), or the bare machine name (groups-only, where no count line
	 * would otherwise say what to build).
	 */
	private machinesLine(node: RecipeNode): string
	{
		switch (this.settings.graph().machineDisplay) {
			case 'decimal': {
				const clock = this.recipeClockFor(node) ?? node.groups[0]?.clockSpeed ?? 100;
				const machines = clock > 0 ? node.target * 100 / clock : node.target;
				return `${this.rateFormatter.machineCount(machines)}× ${node.machine.name} @ ${this.rateFormatter.clock(clock)}%`;
			}
			case 'groups-only':
				return node.machine.name;
			default:
				return `${Math.ceil(node.amount - 1e-9)}× ${node.machine.name}`;
		}
	}

	/**
	 * The clock the plan's Overclocking settings prescribe for this recipe -
	 * the per-recipe override or the plan default. Null without an active plan
	 * (the read-only share view), where the groups' clock is all there is.
	 */
	private recipeClockFor(node: RecipeNode): number | null
	{
		const settings = this.planManager.activePlan()?.settings;
		if (!settings) {
			return null;
		}
		return settings.recipeClockSpeeds?.find(entry => entry.recipeClassName === node.recipe.className)?.clockSpeed
			?? settings.defaultClockSpeed
			?? 100;
	}

	/** One line per machine group; none in decimal machine display. */
	private recipeStats(node: RecipeNode): string
	{
		if (this.settings.graph().machineDisplay === 'decimal') {
			return '';
		}
		return node.groups.map(group => this.groupStatLine(group)).join('\n');
	}

	/**
	 * Extra Y shift centering the top-pinned label block vertically: the block
	 * only fills the node when it has enough stat lines to outgrow the minimum
	 * height - with fewer, the leftover space is split evenly instead of all
	 * sitting below the text.
	 */
	private labelBlockOffset(stats: string, height: number): number
	{
		const lines = stats === '' ? 0 : stats.split('\n').length;
		const naturalHeight = RECIPE_STATS_Y + RECIPE_STATS_LINE_HEIGHT * lines + RECIPE_BOTTOM_PADDING;
		return Math.max(0, (height - naturalHeight) / 2);
	}

	/**
	 * A machine group's stat line: count, clock and (for slooped groups) the
	 * sloop count. The "+K" keeps the number; the somersloop icon that replaces
	 * the "S" is drawn separately (see recipeSloopBadges), so it is omitted here.
	 */
	private groupStatLine(group: MachineGroup): string
	{
		const sloops = group.sloops > 0 ? ` +${group.sloops}` : '';
		return `${group.machines} @ ${this.rateFormatter.clock(group.clockSpeed)}%${sloops}`;
	}

	/** Bold sink-point total shown between the name and the item lines. */
	private sinkPointsLine(node: SinkNode): string
	{
		return `${this.rateFormatter.amount(node.sinkPoints())} points/min`;
	}

	/** The single sinked item and its rate. */
	private sinkStats(node: SinkNode): string
	{
		return `${this.rateFormatter.rate(node.amount, node.item)} ${node.item.name}`;
	}

}
