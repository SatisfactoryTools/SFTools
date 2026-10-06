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

const EPSILON = 1e-6;

/** HiGHS reports primals with ~6 significant digits, so a perfectly solved graph carries relative noise around 1e-6. */
const TOLERANCE = 1e-4;

const ABSOLUTE_TOLERANCE = 0.001;

@Injectable({providedIn: 'root'})
export class GraphReconciler
{

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

	/** Compares two locally computed numbers, so unlike the flow warnings no solver-noise tolerance applies. */
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

	private growIncoming(
		edited: Node,
		itemClassName: string,
		deficit: number,
		itemEdges: GraphEdge[],
		nodes: Node[],
		edges: GraphEdge[],
	): void
	{
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

	/** The edited node is exempt: its amount is the contract the user just set, even when unconnected. */
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

	private hasFixedDemand(node: Node): boolean
	{
		return node instanceof RecipeNode || node instanceof ProductNode || node instanceof SubplanNode || node instanceof SinkNode;
	}

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
