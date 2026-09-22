import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {NodeResizer} from '@src/Model/Planner/NodeResizer';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ProductionNodeScaler} from '@src/Model/Planner/ProductionNodeScaler';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/**
 * Resizes a whole subplan: every rate in its graph is multiplied by the
 * factor, its machines are rebuilt for the bigger (or smaller) target per
 * the plan's grouping and clock settings, and its own production requests
 * and inputs follow, so recalculating the subplan reproduces the new size
 * instead of snapping back. Subplans nested inside are resized with it -
 * each one only once, however many nodes point at it.
 *
 * The subplan's graph is the single source of truth for its size: the
 * parent's subplan node has no scale of its own, it just re-reads the
 * subplan's interface afterwards (see SubplanIOResolver).
 */
@Injectable({providedIn: 'root'})
export class SubplanScaler
{

	public constructor(
		private readonly planManager: PlanManager,
		private readonly planSerializer: PlanSerializer,
		private readonly nodeScaler: ProductionNodeScaler,
		private readonly resizer: NodeResizer,
		private readonly subplanIO: SubplanIOResolver,
	)
	{
	}

	/**
	 * Multiplies the subplan (and everything nested in it) by `factor`.
	 * Throws when the graph cannot be read; does nothing for a factor of 1,
	 * an unusable factor or a plan that cannot be edited.
	 */
	public scale(subplanId: string, factor: number): void
	{
		this.scaleInto(subplanId, factor, new Set());
	}

	private scaleInto(planId: string, factor: number, scaled: Set<string>): void
	{
		if (!isFinite(factor) || factor <= 0 || factor === 1 || scaled.has(planId)) {
			return;
		}
		if (this.planManager.isReadOnlyPlan(planId)) {
			return;
		}
		const plan = this.planManager.findPlan(planId);
		if (!plan) {
			return;
		}
		scaled.add(planId);

		if (plan.graph) {
			// Nested subplans first: their nodes here re-read an interface
			// that must already be the resized one.
			const graph = this.planSerializer.reviveGraph(plan.graph);
			graph.nodes
				.filter((node): node is SubplanNode => node instanceof SubplanNode)
				.forEach(node => this.scaleInto(node.subplanId, factor, scaled));
			this.planManager.setGraph(planId, this.scaledGraph(graph, factor, plan.settings));
		}

		// Maximise rows carry no rate to scale - they ask for "as much as possible".
		this.planManager.setRequests(planId, plan.requests.map(request => (request.mode ?? 'rate') === 'rate'
			? {...request, ratePerMinute: request.ratePerMinute * factor}
			: {...request}));
		this.planManager.setInputs(planId, plan.inputs.map(input => ({...input, amount: input.amount * factor})));
	}

	private scaledGraph(graph: Graph, factor: number, settings: PlanSettings): Graph
	{
		return {
			nodes: graph.nodes.map(node => this.scaledNode(node, factor, settings)),
			edges: graph.edges.map(edge => ({...edge, amount: edge.amount * factor})),
		};
	}

	private scaledNode(node: Node, factor: number, settings: PlanSettings): Node
	{
		if (node instanceof RecipeNode || node instanceof GeneratorNode || node instanceof MineNode) {
			return this.nodeScaler.scaled(node, factor, settings);
		}
		if (node instanceof ItemAmountNode) {
			return this.resizer.withAmount(node, node.amount * factor);
		}
		// A nested subplan node re-reads the interface of its (already
		// resized) subplan rather than being scaled itself.
		if (node instanceof SubplanNode) {
			return this.subplanIO.refresh(node);
		}
		return node;
	}

}
