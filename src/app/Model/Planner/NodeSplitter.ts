import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';
import {NodeResizer} from '@src/Model/Planner/NodeResizer';
import {NodeSplitMode} from '@src/Model/Planner/NodeSplitMode';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ProductionNodeScaler} from '@src/Model/Planner/ProductionNodeScaler';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/**
 * Splits one node into several smaller copies of itself, so that a node fed
 * from (or feeding) several places becomes one node per place.
 *
 * The node is treated as a bar of length 1 that every connection covers a
 * slice of: an item's connections are laid out end to end, each taking the
 * share of the bar its rate is worth. Cutting the bar at the ends of those
 * slices gives the copies - one cut set per side, or both sets together for
 * the "single source, single target" split, which is why that one needs the
 * fewest copies possible. A copy is that slice of the original: its
 * production, its machines and all its other connections scale with it, so
 * the totals on both sides come out exactly as they were.
 *
 * Only connections that a cut falls inside are divided in two; the rest move
 * over whole. Subplan nodes are never split - a subplan is resized as a whole
 * (see SubplanScaler).
 */
@Injectable({providedIn: 'root'})
export class NodeSplitter
{

	/** Rates below this count as nothing at all. */
	private static readonly EPSILON = 1e-9;

	/**
	 * Slices thinner than this share of the node are rounding dust, not a
	 * real copy - two connections of the same rate must not leave a sliver
	 * of a node between them.
	 */
	private static readonly MIN_SLICE = 1e-6;

	public constructor(
		private readonly scaler: ProductionNodeScaler,
		private readonly resizer: NodeResizer,
	)
	{
	}

	/** Nodes this class can split at all. */
	public isSplittable(node: Node): boolean
	{
		return !(node instanceof SubplanNode);
	}

	/** How many nodes the split would produce; 1 when there is nothing to split. */
	public pieceCount(graph: Graph, nodeId: string, mode: NodeSplitMode): number
	{
		const node = graph.nodes.find(candidate => candidate.id === nodeId);
		if (!node || !this.isSplittable(node)) {
			return 1;
		}
		return this.cuts(graph, nodeId, mode).length - 1;
	}

	/**
	 * The graph with the node replaced by its copies and every connection
	 * re-attached; null when the node cannot be split or the split would
	 * produce a single node. The copies are spread out from the original's
	 * position by `offset` each, staying centred on it, and they come back
	 * locked - splitting by hand is a manual edit the solver must not undo.
	 * `settings` are those of the plan the node lives in.
	 */
	public split(
		graph: Graph,
		nodeId: string,
		mode: NodeSplitMode,
		settings: PlanSettings | null,
		offset: GraphPoint,
	): Graph | null
	{
		const node = graph.nodes.find(candidate => candidate.id === nodeId);
		if (!node || !this.isSplittable(node)) {
			return null;
		}

		const cuts = this.cuts(graph, nodeId, mode);
		const count = cuts.length - 1;
		if (count < 2) {
			return null;
		}

		const pieces: Node[] = [];
		for (let index = 0; index < count; index++) {
			const piece = this.piece(node, cuts[index + 1] - cuts[index], settings, index === 0 ? node.id : crypto.randomUUID());
			if (!piece) {
				return null;
			}
			piece.x = node.x + offset.x * (index - (count - 1) / 2);
			piece.y = node.y + offset.y * (index - (count - 1) / 2);
			pieces.push(piece);
		}

		// A node feeding itself has nothing to hand over - the first copy
		// keeps the original's id, so such a connection stays valid as it is.
		const edges = graph.edges.filter(edge => (edge.sourceId !== nodeId && edge.targetId !== nodeId)
			|| (edge.sourceId === nodeId && edge.targetId === nodeId));

		this.byItem(this.incoming(graph, nodeId)).forEach(group => this.reconnect(group, cuts, pieces,
			(edge, piece, amount) => edges.push({sourceId: edge.sourceId, targetId: piece.id, itemClassName: edge.itemClassName, amount})));
		this.byItem(this.outgoing(graph, nodeId)).forEach(group => this.reconnect(group, cuts, pieces,
			(edge, piece, amount) => edges.push({sourceId: piece.id, targetId: edge.targetId, itemClassName: edge.itemClassName, amount})));

		return {
			nodes: graph.nodes.flatMap(candidate => candidate.id === nodeId ? pieces : [candidate]),
			edges,
		};
	}

	/**
	 * Where the node is cut, as shares of it from 0 to 1 - the copies are the
	 * gaps between two neighbouring entries, so a node nothing asks to be cut
	 * comes back as [0, 1].
	 */
	private cuts(graph: Graph, nodeId: string, mode: NodeSplitMode): number[]
	{
		const found: number[] = [];
		if (mode !== 'outputs') {
			this.byItem(this.incoming(graph, nodeId)).forEach(group => this.collectCuts(group, found));
		}
		if (mode !== 'inputs') {
			this.byItem(this.outgoing(graph, nodeId)).forEach(group => this.collectCuts(group, found));
		}

		const cuts = [0];
		found.sort((a, b) => a - b).forEach(cut => {
			if (cut > cuts[cuts.length - 1] + NodeSplitter.MIN_SLICE && cut < 1 - NodeSplitter.MIN_SLICE) {
				cuts.push(cut);
			}
		});
		cuts.push(1);
		return cuts;
	}

	/** The ends of one item's connection slices, bar the last (which is the end of the node). */
	private collectCuts(group: GraphEdge[], cuts: number[]): void
	{
		const total = this.total(group);
		if (total <= NodeSplitter.EPSILON) {
			return;
		}
		let covered = 0;
		group.slice(0, -1).forEach(edge => {
			covered += edge.amount;
			cuts.push(covered / total);
		});
	}

	/**
	 * Hands one item's connections over to the copies whose share of the node
	 * they cover, each getting the part of the rate that overlaps it. A
	 * connection is only ever divided where a cut falls inside it.
	 */
	private reconnect(
		group: GraphEdge[],
		cuts: number[],
		pieces: Node[],
		emit: (edge: GraphEdge, piece: Node, amount: number) => void,
	): void
	{
		const total = this.total(group);
		if (total <= NodeSplitter.EPSILON) {
			// Nothing flows here at all - keep the connections on the first
			// copy rather than dropping them silently.
			group.forEach(edge => emit(edge, pieces[0], edge.amount));
			return;
		}

		let start = 0;
		group.forEach(edge => {
			const width = edge.amount / total;
			const end = start + width;
			if (width <= NodeSplitter.MIN_SLICE) {
				emit(edge, pieces[this.pieceAt(cuts, start)], edge.amount);
			} else {
				for (let index = 0; index < pieces.length; index++) {
					const overlap = Math.min(end, cuts[index + 1]) - Math.max(start, cuts[index]);
					if (overlap > NodeSplitter.MIN_SLICE) {
						emit(edge, pieces[index], edge.amount * (overlap / width));
					}
				}
			}
			start = end;
		});
	}

	/** Index of the copy the given share of the node falls in. */
	private pieceAt(cuts: number[], share: number): number
	{
		for (let index = cuts.length - 2; index > 0; index--) {
			if (share >= cuts[index]) {
				return index;
			}
		}
		return 0;
	}

	/**
	 * One copy of the node at `share` of its size, under the given id. Recipe,
	 * generator and mine nodes go through the production scaler, so their
	 * machines are arranged for the smaller target exactly as the original's
	 * were - same grouping mode, same clocks; the item nodes are simply
	 * re-rated. Null when the node type cannot be copied this way.
	 */
	private piece(node: Node, share: number, settings: PlanSettings | null, id: string): Node | null
	{
		let copy: Node | null;
		if (node instanceof RecipeNode || node instanceof GeneratorNode || node instanceof MineNode) {
			copy = this.scaler.scaled(node, share, settings, id);
		} else if (node instanceof ItemAmountNode) {
			copy = this.resizer.withSize(node, node.amount * share, id);
		} else {
			copy = null;
		}
		// A scaler that could not do the job hands back the node itself.
		if (!copy || copy.id !== id) {
			return null;
		}
		copy.locked = true;
		copy.done = node.done;
		return copy;
	}

	private incoming(graph: Graph, nodeId: string): GraphEdge[]
	{
		return graph.edges.filter(edge => edge.targetId === nodeId && edge.sourceId !== nodeId);
	}

	private outgoing(graph: Graph, nodeId: string): GraphEdge[]
	{
		return graph.edges.filter(edge => edge.sourceId === nodeId && edge.targetId !== nodeId);
	}

	/**
	 * The connections by item, biggest first. Ordering both sides the same
	 * way lines equal rates up, so a node fed 60+30 and sending 60+30 splits
	 * in two rather than three.
	 */
	private byItem(edges: GraphEdge[]): Map<string, GraphEdge[]>
	{
		const groups = new Map<string, GraphEdge[]>();
		edges.forEach(edge => {
			const group = groups.get(edge.itemClassName) ?? [];
			group.push(edge);
			groups.set(edge.itemClassName, group);
		});
		groups.forEach(group => group.sort((a, b) => b.amount - a.amount));
		return groups;
	}

	private total(edges: GraphEdge[]): number
	{
		return edges.reduce((sum, edge) => sum + edge.amount, 0);
	}

}
