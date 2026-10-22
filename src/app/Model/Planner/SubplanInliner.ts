import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {NodeResizer} from '@src/Model/Planner/NodeResizer';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {ProductionNodeScaler} from '@src/Model/Planner/ProductionNodeScaler';
import {SubplanInlineResult} from '@src/Model/Planner/SubplanInlineResult';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/** Leftovers below this are solver rounding (HiGHS keeps 6 significant digits), not a real shortfall. */
const TOLERANCE = 1e-4;

@Injectable({providedIn: 'root'})
export class SubplanInliner
{

	public constructor(
		private readonly planSerializer: PlanSerializer,
		private readonly nodeScaler: ProductionNodeScaler,
		private readonly resizer: NodeResizer,
		private readonly subplanIO: SubplanIOResolver,
	)
	{
	}

	/** The subplan's own input/product/byproduct nodes dissolve into direct connections; whatever the parent did not cover stays as an input or byproduct. */
	public inlined(parent: Graph, node: SubplanNode, subplan: Plan): SubplanInlineResult
	{
		const inner = this.scaled(this.placedCopy(subplan.graph ?? {nodes: [], edges: []}, node), node.buildCount, subplan);

		const inputs = inner.nodes.filter((n): n is InputNode => n instanceof InputNode);
		const outputs = inner.nodes.filter((n): n is ItemAmountNode => n instanceof ProductNode || n instanceof ByproductNode);
		const inputIds = new Set(inputs.map(n => n.id));
		const outputIds = new Set(outputs.map(n => n.id));

		let edges = inner.edges.filter(e => !inputIds.has(e.sourceId));
		this.groupByItem(inner.edges.filter(e => inputIds.has(e.sourceId))).forEach((demands, itemClassName) => {
			const supplies = parent.edges.filter(e => e.targetId === node.id && e.itemClassName === itemClassName);
			const matched = this.matched(supplies, demands);
			edges.push(...matched.edges, ...matched.leftDemands);
		});

		const intoOutputs = edges.filter(e => outputIds.has(e.targetId));
		edges = edges.filter(e => !outputIds.has(e.targetId));
		this.groupByItem(intoOutputs).forEach((supplies, itemClassName) => {
			const demands = parent.edges.filter(e => e.sourceId === node.id && e.itemClassName === itemClassName);
			const matched = this.matched(supplies, demands);
			edges.push(...matched.edges, ...matched.leftSupplies);
		});

		const leftovers = new Map<string, number>();
		edges.forEach(e => {
			const boundaryId = inputIds.has(e.sourceId) ? e.sourceId : outputIds.has(e.targetId) ? e.targetId : null;
			if (boundaryId !== null) {
				leftovers.set(boundaryId, (leftovers.get(boundaryId) ?? 0) + e.amount);
			}
		});

		const nodes = inner.nodes.flatMap(n => {
			if (!inputIds.has(n.id) && !outputIds.has(n.id)) {
				return [n];
			}
			const amount = leftovers.get(n.id);
			if (amount === undefined) {
				return [];
			}
			// An unused subplan output was surplus in the parent; as a product it would add to the parent's own outputs.
			return [n instanceof InputNode ? this.resizer.withAmount(n, amount) : this.byproductOf(n as ItemAmountNode, amount)];
		});
		// Locked like Convert to subplan: the parent's requests do not ask for any of this, so a recalculation would drop it.
		nodes.forEach(n => n.locked = true);

		return {
			graph: {
				nodes: [...parent.nodes.filter(n => n.id !== node.id), ...nodes],
				edges: this.mergeParallelEdges([
					...parent.edges.filter(e => e.sourceId !== node.id && e.targetId !== node.id),
					...edges,
				]),
			},
			nodeIds: nodes.map(n => n.id),
		};
	}

	/** Fresh ids (the parent may already hold copies of these nodes), centred on the subplan node. */
	private placedCopy(graph: Graph, node: SubplanNode): Graph
	{
		const raw = JSON.parse(JSON.stringify(graph)) as {nodes: {id: string; x?: number; y?: number}[]; edges: GraphEdge[]};
		const xs = raw.nodes.map(n => n.x ?? 0);
		const ys = raw.nodes.map(n => n.y ?? 0);
		const dx = raw.nodes.length > 0 ? node.x - (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
		const dy = raw.nodes.length > 0 ? node.y - (Math.min(...ys) + Math.max(...ys)) / 2 : 0;

		const ids = new Map(raw.nodes.map(n => [n.id, crypto.randomUUID()]));
		const nodes = raw.nodes.map(n => ({...n, id: ids.get(n.id)!, x: (n.x ?? 0) + dx, y: (n.y ?? 0) + dy}));
		const edges = raw.edges.map(e => ({
			...e,
			sourceId: ids.get(e.sourceId) ?? e.sourceId,
			targetId: ids.get(e.targetId) ?? e.targetId,
			vertices: e.vertices?.map(v => ({x: v.x + dx, y: v.y + dy})),
		}));
		return this.planSerializer.reviveGraph({nodes, edges} as unknown as Graph);
	}

	/** Built N× means N copies land in the parent; nested subplans keep their blueprint and are built N× as often instead. */
	private scaled(graph: Graph, buildCount: number, subplan: Plan): Graph
	{
		if (buildCount === 1) {
			return graph;
		}
		return {
			nodes: graph.nodes.map(n => {
				if (n instanceof SubplanNode) {
					return this.subplanIO.withBuildCount(n, n.buildCount * buildCount);
				}
				if (n instanceof ItemAmountNode) {
					return this.resizer.withAmount(n, n.amount * buildCount);
				}
				return this.nodeScaler.scaled(n, buildCount, subplan.settings);
			}),
			edges: graph.edges.map(e => ({...e, amount: e.amount * buildCount})),
		};
	}

	/** Pairs flows in order; what one side cannot cover comes back as leftover edges on the original endpoints. */
	private matched(supplies: GraphEdge[], demands: GraphEdge[]): {edges: GraphEdge[]; leftSupplies: GraphEdge[]; leftDemands: GraphEdge[]}
	{
		const supplyLeft = supplies.map(e => e.amount);
		const demandLeft = demands.map(e => e.amount);
		const edges: GraphEdge[] = [];
		let s = 0;
		let d = 0;
		while (s < supplies.length && d < demands.length) {
			const amount = Math.min(supplyLeft[s], demandLeft[d]);
			if (amount > 0) {
				edges.push({sourceId: supplies[s].sourceId, targetId: demands[d].targetId, itemClassName: supplies[s].itemClassName, amount});
			}
			supplyLeft[s] -= amount;
			demandLeft[d] -= amount;
			if (supplyLeft[s] <= TOLERANCE) {
				s++;
			}
			if (demandLeft[d] <= TOLERANCE) {
				d++;
			}
		}
		return {
			edges,
			leftSupplies: this.leftovers(supplies, supplyLeft),
			leftDemands: this.leftovers(demands, demandLeft),
		};
	}

	private leftovers(edges: GraphEdge[], left: number[]): GraphEdge[]
	{
		return edges.flatMap((edge, i) => {
			if (left[i] <= TOLERANCE) {
				return [];
			}
			return left[i] === edge.amount ? [edge] : [{...edge, amount: left[i], vertices: undefined, labelDistance: undefined}];
		});
	}

	private byproductOf(node: ItemAmountNode, amount: number): ByproductNode
	{
		const byproduct = new ByproductNode(node.id, amount, node.item);
		byproduct.x = node.x;
		byproduct.y = node.y;
		byproduct.done = node.done;
		return byproduct;
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
				merged.set(key, {...existing, amount: existing.amount + edge.amount, vertices: undefined, labelDistance: undefined});
			} else {
				merged.set(key, edge);
			}
		});
		return [...merged.values()];
	}

}
