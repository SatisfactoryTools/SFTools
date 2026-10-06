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
			// Nested subplans first: their nodes here re-read an interface that must already be resized.
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
		// Re-reads the already resized subplan rather than being scaled itself.
		if (node instanceof SubplanNode) {
			return this.subplanIO.refresh(node);
		}
		return node;
	}

}
