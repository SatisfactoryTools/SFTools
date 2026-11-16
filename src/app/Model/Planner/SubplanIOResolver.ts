import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphIOParts} from '@src/Model/Planner/GraphIOParts';
import {GraphIOResolver} from '@src/Model/Planner/GraphIOResolver';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SubplanSizing} from '@src/Model/Planner/SubplanSizing';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

@Injectable({providedIn: 'root'})
export class SubplanIOResolver
{

	/** Recalculated subplans carry float noise; anything finer than this is the same interface. */
	private static readonly TOLERANCE = 1e-6;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly graphIO: GraphIOResolver,
	)
	{
	}

	public refresh(node: SubplanNode): SubplanNode
	{
		return this.rebuild(node, {});
	}

	public withBuildCount(node: SubplanNode, buildCount: number): SubplanNode
	{
		return this.rebuild(node, {buildCount: this.normalizeBuildCount(buildCount), idle: false});
	}

	public withSizing(node: SubplanNode, sizing: SubplanSizing): SubplanNode
	{
		return this.rebuild(node, {sizing, idle: false});
	}

	public withIdle(node: SubplanNode, idle: boolean): SubplanNode
	{
		return this.rebuild(node, {idle});
	}

	public normalizeBuildCount(buildCount: number): number
	{
		if (!isFinite(buildCount)) {
			return 1;
		}
		return Math.max(1, Math.round(buildCount));
	}

	public resolve(plan: Plan): {inputs: NodeIO[]; outputs: NodeIO[]}
	{
		return this.resolveGraph(plan.graph);
	}

	public resolveGraph(graph: Graph | null): {inputs: NodeIO[]; outputs: NodeIO[]}
	{
		return this.graphIO.resolve(graph);
	}

	/** One build of the subplan, split into what it was asked to make and what it makes on the side. */
	public parts(subplanId: string): GraphIOParts
	{
		return this.graphIO.parts(this.planManager.findPlan(subplanId)?.graph ?? null);
	}

	/**
	 * What one unit of the node's calculation column stands for: the whole node as it is built now when it follows the parent
	 * (the column is the factor it is resized by), a single copy when the parent picks the number of copies.
	 */
	public unitIO(node: SubplanNode): {inputs: NodeIO[]; outputs: NodeIO[]}
	{
		const io = this.resolveGraph(this.planManager.findPlan(node.subplanId)?.graph ?? null);
		const factor = node.sizing === 'copies' ? 1 : Math.max(1, node.buildCount);
		return {inputs: this.scaled(io.inputs, factor), outputs: this.scaled(io.outputs, factor)};
	}

	/** Same inputs and outputs: only the name or the bookkeeping differs. */
	public sameInterface(a: SubplanNode, b: SubplanNode): boolean
	{
		return this.sameIO(a.inputs, b.inputs) && this.sameIO(a.outputs, b.outputs);
	}

	/** True when the node no longer shows what its subplan does now. */
	public isStale(node: SubplanNode): boolean
	{
		return this.refresh(node) !== node;
	}

	private rebuild(node: SubplanNode, changes: {buildCount?: number; sizing?: SubplanSizing; idle?: boolean}): SubplanNode
	{
		const plan = this.planManager.findPlan(node.subplanId);
		if (!plan) {
			return node;
		}
		const count = changes.buildCount ?? this.normalizeBuildCount(node.buildCount);
		const sizing = changes.sizing ?? node.sizing;
		// A fixed subplan is always built.
		const idle = sizing === 'fixed' ? false : changes.idle ?? node.idle;
		const io = this.resolveGraph(plan.graph);
		const inputs = idle ? [] : this.scaled(io.inputs, count);
		const outputs = idle ? [] : this.scaled(io.outputs, count);
		if (plan.name === node.name && count === node.buildCount && sizing === node.sizing && idle === node.idle
			&& this.sameIO(node.inputs, inputs) && this.sameIO(node.outputs, outputs)) {
			return node;
		}
		const refreshed = new SubplanNode(node.id, node.subplanId, plan.name, inputs, outputs, count, sizing, idle);
		refreshed.x = node.x;
		refreshed.y = node.y;
		refreshed.done = node.done;
		return refreshed;
	}

	private scaled(io: NodeIO[], factor: number): NodeIO[]
	{
		return factor === 1 ? io : io.map(entry => new NodeIO(entry.item, entry.maxAmount * factor));
	}

	private sameIO(a: NodeIO[], b: NodeIO[]): boolean
	{
		if (a.length !== b.length) {
			return false;
		}
		const byClassName = new Map(a.map(io => [io.item.className, io.maxAmount]));
		return b.every(io => {
			const amount = byClassName.get(io.item.className);
			return amount !== undefined
				&& Math.abs(amount - io.maxAmount) <= SubplanIOResolver.TOLERANCE * Math.max(1, Math.abs(io.maxAmount));
		});
	}

}
