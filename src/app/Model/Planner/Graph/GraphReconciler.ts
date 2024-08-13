import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphNodeCapacityWarning} from '@src/Model/Planner/Graph/GraphNodeCapacityWarning';
import {GraphNodeInputWarning} from '@src/Model/Planner/Graph/GraphNodeInputWarning';
import {GraphNodeOutputWarning} from '@src/Model/Planner/Graph/GraphNodeOutputWarning';
import {GraphNodeWarnings} from '@src/Model/Planner/Graph/GraphNodeWarnings';
import {Item} from '@src/Model/Data/Entities/Item';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SinkNode} from '@src/Model/Planner/Solver/Response/SinkNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/** Below this, an edge or an elastic node is considered depleted. */
const EPSILON = 1e-6;

/**
 * Relative mismatch below which flows count as equal. HiGHS reports primal
 * values with ~6 significant digits, so a perfectly solved graph carries
 * relative noise around 1e-6 - warn only well above it.
 */
const TOLERANCE = 1e-4;

/**
 * Absolute mismatch floor for warnings: differences below a thousandth of an
 * item per minute are solver noise, never actionable.
 */
const ABSOLUTE_TOLERANCE = 0.001;

/**
 * Keeps a graph's edges consistent with a manually edited node under the
 * "flows are contracts" policy: only the edited node's own edges adjust.
 * New demand draws from genuinely spare supply (upstream surplus, flow
 * already headed to a byproduct, elastic input nodes); freed supply simply
 * stays with the upstream producer. Everything that cannot be settled this
 * way is reported by computeWarnings() - resolving those is the job of the
 * (lock-aware) solver, never of this class. It follows that no byproduct
 * node is ever created here.
 */
@Injectable({providedIn: 'root'})
export class GraphReconciler
{

	/**
	 * Adjusts the edited node's edge amounts in place (preserving user-edited
	 * routing), resizes connected elastic nodes, and returns the graph with
	 * depleted edges and elastic nodes pruned.
	 */
	public reconcile(graph: Graph, editedNodeId: string): Graph
	{
		const nodes = [...graph.nodes];
		const edges = [...graph.edges];
		const edited = nodes.find(node => node.id === editedNodeId);
		if (!edited) {
			return {nodes, edges};
		}

		this.settleInputs(edited, nodes, edges);
		this.settleOutputs(edited, nodes, edges);

		const keptNodes = this.recomputeElasticNodes(nodes, edges, editedNodeId);
		const keptIds = new Set(keptNodes.map(node => node.id));
		const keptEdges = edges.filter(edge =>
			edge.amount > EPSILON && keptIds.has(edge.sourceId) && keptIds.has(edge.targetId));

		return {nodes: keptNodes, edges: keptEdges};
	}

	/** Nodes whose flows disagree with their configuration, keyed by node id. */
	public computeWarnings(graph: Graph): Map<string, GraphNodeWarnings>
	{
		const warnings = new Map<string, GraphNodeWarnings>();

		graph.nodes.forEach(node => {
			const inputs: GraphNodeInputWarning[] = [];
			const outputs: GraphNodeOutputWarning[] = [];
			const capacity = this.capacityWarningFor(node);

			if (this.hasFixedDemand(node)) {
				this.requiredInputs(node).forEach((required, itemClassName) => {
					const supplied = this.sumEdges(graph.edges, edge =>
						edge.targetId === node.id && edge.itemClassName === itemClassName);
					if (this.differs(required, supplied)) {
						inputs.push({itemClassName, required, supplied});
					}
				});
			}
			if (this.hasFixedSupply(node)) {
				this.producedOutputs(node).forEach((produced, itemClassName) => {
					const consumed = this.sumEdges(graph.edges, edge =>
						edge.sourceId === node.id && edge.itemClassName === itemClassName);
					if (this.differs(produced, consumed)) {
						outputs.push({itemClassName, produced, consumed});
					}
				});
			}

			if (inputs.length > 0 || outputs.length > 0 || capacity !== null) {
				warnings.set(node.id, {inputs, outputs, capacity});
			}
		});

		return warnings;
	}

	/** Output flow the node produces but does not yet send along any edge (≥ 0). */
	public spareOutput(graph: Graph, nodeId: string, itemClassName: string): number
	{
		const node = this.nodeById(graph.nodes, nodeId);
		if (!node) {
			return 0;
		}
		const produced = this.producedOutputs(node).get(itemClassName) ?? 0;
		const sent = this.sumEdges(graph.edges, edge => edge.sourceId === nodeId && edge.itemClassName === itemClassName);
		return Math.max(0, produced - sent);
	}

	/** Input flow the node's configuration requires but no edge supplies yet (≥ 0). */
	public remainingDemand(graph: Graph, nodeId: string, itemClassName: string): number
	{
		const node = this.nodeById(graph.nodes, nodeId);
		if (!node) {
			return 0;
		}
		const required = this.requiredInputs(node).get(itemClassName) ?? 0;
		const supplied = this.sumEdges(graph.edges, edge => edge.targetId === nodeId && edge.itemClassName === itemClassName);
		return Math.max(0, required - supplied);
	}

	/**
	 * Machine counts no longer follow the target - warn when the built
	 * machines cannot reach it. Unlike the flow warnings, this compares two
	 * locally computed numbers, so no solver-noise tolerance applies.
	 */
	private capacityWarningFor(node: Node): GraphNodeCapacityWarning | null
	{
		if (!(node instanceof RecipeNode) || !node.hasCapacityShortage()) {
			return null;
		}
		return {target: node.target, capacity: node.capacity()};
	}

	private settleInputs(edited: Node, nodes: Node[], edges: GraphEdge[]): void
	{
		const required = this.requiredInputs(edited);
		const incoming = edges.filter(edge => edge.targetId === edited.id);

		this.itemClasses(required, incoming).forEach(itemClassName => {
			const itemEdges = incoming.filter(edge => edge.itemClassName === itemClassName);
			const need = required.get(itemClassName) ?? 0;
			const current = itemEdges.reduce((sum, edge) => sum + edge.amount, 0);

			if (!this.differs(need, current)) {
				return;
			}
			if (need <= 0) {
				itemEdges.forEach(edge => edge.amount = 0);
				return;
			}
			if (need < current) {
				const factor = need / current;
				itemEdges.forEach(edge => edge.amount *= factor);
				return;
			}
			this.growIncoming(edited, itemClassName, need - current, itemEdges, nodes, edges);
		});
	}

	/**
	 * Covers an input deficit using only spare supply, in priority order:
	 * genuine upstream surplus, flow the upstream already discards into a
	 * byproduct, and elastic input-node sources. Anything left surfaces as
	 * an input warning.
	 */
	private growIncoming(
		edited: Node,
		itemClassName: string,
		deficit: number,
		itemEdges: GraphEdge[],
		nodes: Node[],
		edges: GraphEdge[],
	): void
	{
		// 1. Genuine surplus: the source produces more than it sends anywhere.
		itemEdges.forEach(edge => {
			if (deficit <= EPSILON) return;
			const source = this.nodeById(nodes, edge.sourceId);
			if (!source || source instanceof InputNode) return;
			const produced = this.producedOutputs(source).get(itemClassName) ?? 0;
			const sent = this.sumEdges(edges, e => e.sourceId === source.id && e.itemClassName === itemClassName);
			const take = Math.min(deficit, Math.max(0, produced - sent));
			edge.amount += take;
			deficit -= take;
		});

		// 2. Reroute flow the source currently discards into a byproduct node.
		itemEdges.forEach(edge => {
			if (deficit <= EPSILON) return;
			const source = this.nodeById(nodes, edge.sourceId);
			if (!source || source instanceof InputNode) return;
			edges
				.filter(e => e.sourceId === source.id && e.itemClassName === itemClassName
					&& this.nodeById(nodes, e.targetId) instanceof ByproductNode)
				.forEach(byproductEdge => {
					if (deficit <= EPSILON) return;
					const take = Math.min(deficit, byproductEdge.amount);
					byproductEdge.amount -= take;
					edge.amount += take;
					deficit -= take;
				});
		});

		// 3. Input nodes are elastic sources - they grow freely.
		if (deficit > EPSILON) {
			const inputEdges = itemEdges.filter(edge => this.nodeById(nodes, edge.sourceId) instanceof InputNode);
			if (inputEdges.length > 0) {
				const total = inputEdges.reduce((sum, edge) => sum + edge.amount, 0);
				inputEdges.forEach(edge => {
					edge.amount += total > 0 ? deficit * (edge.amount / total) : deficit / inputEdges.length;
				});
			}
		}
	}

	private settleOutputs(edited: Node, nodes: Node[], edges: GraphEdge[]): void
	{
		const produced = this.producedOutputs(edited);
		const outgoing = edges.filter(edge => edge.sourceId === edited.id);

		this.itemClasses(produced, outgoing).forEach(itemClassName => {
			const itemEdges = outgoing.filter(edge => edge.itemClassName === itemClassName);
			const production = produced.get(itemClassName) ?? 0;
			const current = itemEdges.reduce((sum, edge) => sum + edge.amount, 0);

			if (!this.differs(production, current)) {
				return;
			}
			if (production <= 0) {
				itemEdges.forEach(edge => edge.amount = 0);
				return;
			}
			if (production < current) {
				// Downstream under-supply becomes their own input warnings.
				const factor = production / current;
				itemEdges.forEach(edge => edge.amount *= factor);
				return;
			}
			this.pushSurplus(itemClassName, production - current, itemEdges, nodes, edges);
		});
	}

	/**
	 * Distributes an output surplus along the edited node's existing edges:
	 * first filling each consumer's remaining deficit, then topping up an
	 * already-connected byproduct node. Anything left surfaces as an output
	 * warning.
	 */
	private pushSurplus(
		itemClassName: string,
		surplus: number,
		itemEdges: GraphEdge[],
		nodes: Node[],
		edges: GraphEdge[],
	): void
	{
		itemEdges.forEach(edge => {
			if (surplus <= EPSILON) return;
			const target = this.nodeById(nodes, edge.targetId);
			if (!target || target instanceof ByproductNode || !this.hasFixedDemand(target)) return;
			const required = this.requiredInputs(target).get(itemClassName) ?? 0;
			const supplied = this.sumEdges(edges, e => e.targetId === target.id && e.itemClassName === itemClassName);
			const take = Math.min(surplus, Math.max(0, required - supplied));
			edge.amount += take;
			surplus -= take;
		});

		if (surplus > EPSILON) {
			const byproductEdge = itemEdges.find(edge => this.nodeById(nodes, edge.targetId) instanceof ByproductNode);
			if (byproductEdge) {
				byproductEdge.amount += surplus;
			}
		}
	}

	/**
	 * Resizes byproduct/input nodes to their connected flow; drops the
	 * depleted ones. The edited node is exempt - its configuration is the
	 * contract the user just set, so an edited elastic node keeps its amount
	 * (and an unconnected one is not pruned away).
	 */
	private recomputeElasticNodes(nodes: Node[], edges: GraphEdge[], editedNodeId: string): Node[]
	{
		return nodes
			.map(node => {
				if (node.id === editedNodeId) {
					return node;
				}
				if (node instanceof ByproductNode) {
					const total = this.sumEdges(edges, edge => edge.targetId === node.id);
					return this.resized(node, total, item => new ByproductNode(node.id, total, item));
				}
				if (node instanceof InputNode) {
					const total = this.sumEdges(edges, edge => edge.sourceId === node.id);
					return this.resized(node, total, item => new InputNode(node.id, total, item));
				}
				return node;
			})
			.filter(node => node.id === editedNodeId
				|| !((node instanceof ByproductNode || node instanceof InputNode) && node.amount <= EPSILON));
	}

	private resized<T extends ByproductNode | InputNode>(node: T, total: number, create: (item: Item) => T): T
	{
		if (!this.differs(total, node.amount)) {
			return node;
		}
		const replaced = create(node.item);
		replaced.x = node.x;
		replaced.y = node.y;
		replaced.locked = node.locked;
		return replaced;
	}

	/** Recipe, product, subplan and sink nodes consume a fixed amount set by their own configuration. */
	private hasFixedDemand(node: Node): boolean
	{
		return node instanceof RecipeNode || node instanceof ProductNode || node instanceof SubplanNode || node instanceof SinkNode;
	}

	/** Recipe, mine and subplan nodes produce a fixed amount set by their own configuration. */
	private hasFixedSupply(node: Node): boolean
	{
		return node instanceof RecipeNode || node instanceof MineNode || node instanceof SubplanNode;
	}

	private requiredInputs(node: Node): Map<string, number>
	{
		const required = new Map<string, number>();
		node.inputs.forEach(io =>
			required.set(io.item.className, (required.get(io.item.className) ?? 0) + io.maxAmount));
		return required;
	}

	private producedOutputs(node: Node): Map<string, number>
	{
		const produced = new Map<string, number>();
		node.outputs.forEach(io =>
			produced.set(io.item.className, (produced.get(io.item.className) ?? 0) + io.maxAmount));
		return produced;
	}

	/** Union of item classes a node exchanges and item classes its edges carry. */
	private itemClasses(rates: Map<string, number>, nodeEdges: GraphEdge[]): Set<string>
	{
		return new Set([...rates.keys(), ...nodeEdges.map(edge => edge.itemClassName)]);
	}

	private sumEdges(edges: GraphEdge[], match: (edge: GraphEdge) => boolean): number
	{
		return edges.filter(match).reduce((sum, edge) => sum + edge.amount, 0);
	}

	private differs(a: number, b: number): boolean
	{
		return Math.abs(a - b) > Math.max(ABSOLUTE_TOLERANCE, TOLERANCE * Math.max(Math.abs(a), Math.abs(b)));
	}

	private nodeById(nodes: Node[], id: string): Node | null
	{
		return nodes.find(node => node.id === id) ?? null;
	}

}
