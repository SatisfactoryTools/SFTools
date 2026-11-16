import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';
import {SubplanScaler} from '@src/Model/Planner/SubplanScaler';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/** Writes what the parent's calculation decided back into its subplan nodes and the subplans themselves. */
@Injectable({providedIn: 'root'})
export class SubplanSizeApplier
{

	private static readonly EPSILON = 1e-6;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly scaler: SubplanScaler,
		private readonly subplanIO: SubplanIOResolver,
	)
	{
	}

	/** Returns the same graph when nothing changed, and the ids of every plan the calculation resized. */
	public apply(graph: Graph, sizes: Record<string, number> | undefined): {graph: Graph; resizedPlanIds: string[]}
	{
		if (sizes === undefined || Object.keys(sizes).length === 0) {
			return {graph, resizedPlanIds: []};
		}

		const resizedPlanIds: string[] = [];
		const idle = new Set<string>();
		const counts = new Map<string, number>();

		// A subplan placed twice can only have one size, so following nodes of one subplan share the total they make.
		const following = new Map<string, {needed: number; built: number; nodeIds: string[]}>();
		graph.nodes.forEach(node => {
			const size = sizes[node.id];
			if (!(node instanceof SubplanNode) || size === undefined) {
				return;
			}
			if (node.sizing === 'copies') {
				if (size < 1) {
					idle.add(node.id);
				} else {
					counts.set(node.id, size);
				}
			} else if (node.sizing === 'follows') {
				const entry = following.get(node.subplanId) ?? {needed: 0, built: 0, nodeIds: []};
				entry.needed += size * Math.max(1, node.buildCount);
				entry.built += Math.max(1, node.buildCount);
				entry.nodeIds.push(node.id);
				following.set(node.subplanId, entry);
			}
		});

		following.forEach((entry, subplanId) => {
			const factor = entry.needed / entry.built;
			if (factor < SubplanSizeApplier.EPSILON) {
				// Kept at its size, so it comes back as it was once the parent needs it again.
				entry.nodeIds.forEach(id => idle.add(id));
				return;
			}
			if (Math.abs(factor - 1) > SubplanSizeApplier.EPSILON) {
				this.scaler.scale(subplanId, factor);
				resizedPlanIds.push(subplanId, ...this.planManager.subplansOf(subplanId).map(plan => plan.id));
			}
		});

		let changed = false;
		const nodes = graph.nodes.map(node => {
			if (!(node instanceof SubplanNode)) {
				return node;
			}
			let updated = node;
			if (idle.has(node.id)) {
				updated = this.subplanIO.withIdle(node, true);
			} else if (counts.has(node.id)) {
				updated = this.subplanIO.withBuildCount(node, counts.get(node.id)!);
			} else if (sizes[node.id] !== undefined) {
				updated = this.subplanIO.withIdle(node, false);
			} else {
				// Other nodes of a resized subplan show its new size too.
				updated = this.subplanIO.refresh(node);
			}
			changed = changed || updated !== node;
			return updated;
		});

		return {graph: changed ? {nodes, edges: graph.edges} : graph, resizedPlanIds};
	}

}
