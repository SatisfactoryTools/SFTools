import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphEdgeBuilder} from '@src/Model/Planner/Graph/GraphEdgeBuilder';
import {GraphMergeResult} from '@src/Model/Planner/Graph/GraphMergeResult';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';

/** Vertical clearance between the existing graph and an added island (covers node height plus a gap). */
const ISLAND_GAP = 200;

/**
 * Combines a freshly solved result with a plan's existing graph, for the
 * manual "upgrade" (merge amounts into matching nodes) and "append" (place
 * alongside) calculation modes.
 */
@Injectable({providedIn: 'root'})
export class GraphComposer
{

	public constructor(private readonly edgeBuilder: GraphEdgeBuilder)
	{
	}

	/**
	 * Merges incoming nodes into the existing graph: an incoming node matching
	 * an existing one (same recipe/machine/clock/sloops, or same item for
	 * mines, products and byproducts) is folded into it by summing amounts and
	 * keeping its position. All edges are rebuilt from the merged amounts;
	 * user-edited routing survives where the same connection still exists.
	 */
	public merge(existing: Graph, incoming: Node[]): GraphMergeResult
	{
		const replacements = new Map<string, Node>();
		const newNodes: Node[] = [];

		incoming.forEach(node => {
			const key = this.identityKey(node);
			const match = existing.nodes.find(candidate =>
				!candidate.locked && !replacements.has(candidate.id) && this.identityKey(candidate) === key);
			if (match) {
				replacements.set(match.id, this.mergedNode(match, node));
			} else {
				newNodes.push(node);
			}
		});

		const nodes = [
			...existing.nodes.map(node => replacements.get(node.id) ?? node),
			...newNodes,
		];

		return {nodes, edges: this.withPriorRouting(this.edgeBuilder.build(nodes, existing.edges), existing.edges), newNodes};
	}

	/**
	 * Replaces the graph's solver-owned part with a fresh solver result, for
	 * lock-aware recalculation: locked nodes pass through verbatim; an
	 * incoming node matching an unlocked existing one takes over its identity
	 * (id and position) but carries only the incoming data - amounts are
	 * REPLACED, never summed. Unmatched existing solver-owned nodes are
	 * dropped; unmatched incoming nodes are returned as newNodes for layout.
	 */
	public rebuild(existing: Graph, incoming: Node[]): GraphMergeResult
	{
		const adoptedByExistingId = new Map<string, Node>();
		const newNodes: Node[] = [];

		incoming.forEach(node => {
			const key = this.identityKey(node);
			const match = existing.nodes.find(candidate =>
				!candidate.locked && !adoptedByExistingId.has(candidate.id) && this.identityKey(candidate) === key);
			if (match) {
				adoptedByExistingId.set(match.id, this.adoptedNode(match, node));
			} else {
				newNodes.push(node);
			}
		});

		const nodes = [
			...existing.nodes
				.map(node => node.locked ? node : adoptedByExistingId.get(node.id))
				.filter((node): node is Node => node !== undefined),
			...newNodes,
		];

		return {nodes, edges: this.withPriorRouting(this.edgeBuilder.build(nodes, existing.edges), existing.edges), newNodes};
	}

	/** Carries user-edited routing over to rebuilt edges where the same connection still exists. */
	private withPriorRouting(edges: GraphEdge[], priorEdges: GraphEdge[]): GraphEdge[]
	{
		return edges.map(edge => {
			const prior = priorEdges.find(e =>
				e.sourceId === edge.sourceId && e.targetId === edge.targetId && e.itemClassName === edge.itemClassName);
			return prior
				? {...edge, vertices: prior.vertices, labelDistance: prior.labelDistance}
				: edge;
		});
	}

	/** Appends a laid-out island below the existing graph, without merging anything. */
	public append(existing: Graph, addition: Graph): Graph
	{
		this.offsetBelow(addition.nodes, addition.edges, existing.nodes);
		return {
			nodes: [...existing.nodes, ...addition.nodes],
			edges: [...existing.edges, ...addition.edges],
		};
	}

	/**
	 * Moves an origin-based island below the anchor nodes' bounding box,
	 * shifting island node positions and the routing of edges that connect
	 * two island nodes (edges into the anchor graph are left unrouted).
	 */
	public offsetBelow(islandNodes: Node[], edges: GraphEdge[], anchorNodes: Node[]): void
	{
		if (islandNodes.length === 0 || anchorNodes.length === 0) {
			return;
		}

		const dx = Math.min(...anchorNodes.map(n => n.x)) - Math.min(...islandNodes.map(n => n.x));
		const dy = Math.max(...anchorNodes.map(n => n.y)) + ISLAND_GAP - Math.min(...islandNodes.map(n => n.y));

		islandNodes.forEach(node => {
			node.x += dx;
			node.y += dy;
		});

		const islandIds = new Set(islandNodes.map(n => n.id));
		edges.forEach(edge => {
			if (edge.vertices && islandIds.has(edge.sourceId) && islandIds.has(edge.targetId)) {
				edge.vertices = edge.vertices.map(point => ({x: point.x + dx, y: point.y + dy}));
			}
		});
	}

	private identityKey(node: Node): string
	{
		// Clock speed and sloops are deliberately not part of the key: solver
		// output always arrives at 100%/0 sloops, and merging into a
		// user-customized node just concatenates its machine groups.
		if (node instanceof RecipeNode) {
			return `recipe:${node.recipe.className}@${node.machine.className}`;
		}
		if (node instanceof GeneratorNode) {
			return `generator:${node.fuel.item.className}@${node.generator.className}`;
		}
		if (node instanceof MineNode || node instanceof ProductNode || node instanceof ByproductNode || node instanceof InputNode) {
			return `${node.type}:${node.item.className}`;
		}
		return `id:${node.id}`;
	}

	private mergedNode(existing: Node, incoming: Node): Node
	{
		const amount = existing.amount + incoming.amount;
		let node: Node;

		if (existing instanceof RecipeNode && incoming instanceof RecipeNode) {
			const merged = new RecipeNode(
				existing.id,
				existing.target + incoming.target,
				this.coalesceGroups([...existing.groups, ...incoming.groups]),
				existing.machine,
				existing.recipe,
			);
			// The existing node may carry a user-chosen grouping mode - keep it.
			merged.groupingMode = existing.groupingMode;
			node = merged;
		} else if (existing instanceof MineNode) {
			node = new MineNode(existing.id, amount, existing.item);
		} else if (existing instanceof ProductNode) {
			node = new ProductNode(existing.id, amount, existing.item);
		} else if (existing instanceof ByproductNode) {
			node = new ByproductNode(existing.id, amount, existing.item);
		} else if (existing instanceof InputNode) {
			node = new InputNode(existing.id, amount, existing.item);
		} else if (existing instanceof GeneratorNode) {
			node = new GeneratorNode(existing.id, amount, existing.generator, existing.fuel);
		} else {
			throw new Error(`Cannot merge node of type: ${existing.type}`);
		}

		node.x = existing.x;
		node.y = existing.y;
		return node;
	}

	/** The incoming node's data under the matched node's identity (id and canvas position). */
	private adoptedNode(match: Node, incoming: Node): Node
	{
		let node: Node;

		if (incoming instanceof RecipeNode) {
			const adopted = new RecipeNode(match.id, incoming.target, incoming.groups, incoming.machine, incoming.recipe);
			adopted.groupingMode = incoming.groupingMode;
			node = adopted;
		} else if (incoming instanceof MineNode) {
			node = new MineNode(match.id, incoming.amount, incoming.item);
		} else if (incoming instanceof ProductNode) {
			node = new ProductNode(match.id, incoming.amount, incoming.item);
		} else if (incoming instanceof ByproductNode) {
			node = new ByproductNode(match.id, incoming.amount, incoming.item);
		} else if (incoming instanceof InputNode) {
			node = new InputNode(match.id, incoming.amount, incoming.item);
		} else if (incoming instanceof GeneratorNode) {
			node = new GeneratorNode(match.id, incoming.amount, incoming.generator, incoming.fuel);
		} else {
			throw new Error(`Cannot adopt node of type: ${incoming.type}`);
		}

		node.x = match.x;
		node.y = match.y;
		return node;
	}

	/** Sums the machine counts of groups sharing the same clock speed and sloops. */
	private coalesceGroups(groups: MachineGroup[]): MachineGroup[]
	{
		const merged: MachineGroup[] = [];
		groups.forEach(group => {
			const index = merged.findIndex(g => g.clockSpeed === group.clockSpeed && g.sloops === group.sloops);
			if (index === -1) {
				merged.push(group);
			} else {
				merged[index] = {...merged[index], machines: merged[index].machines + group.machines};
			}
		});
		return merged;
	}

}
