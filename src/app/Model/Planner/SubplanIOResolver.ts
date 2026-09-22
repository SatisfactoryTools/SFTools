import {Injectable} from '@angular/core';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/**
 * Computes a subplan's outside interface - the items it requires (its input
 * nodes) and provides (its product and byproduct nodes) - from the subplan's
 * stored graph. Works on both hydrated graphs and raw JSON ones (a subplan
 * never opened this session), so no recursive graph revival is needed.
 *
 * A node that builds its subplan several times (`buildCount`) carries the
 * interface multiplied by that count, so everything downstream - the
 * calculation, the edges, the panels - works with the full amounts.
 */
@Injectable({providedIn: 'root'})
export class SubplanIOResolver
{

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
	)
	{
	}

	/**
	 * Rebuilds the node against the subplan's current name and graph; returns
	 * the same instance when nothing changed, or the node itself when the
	 * subplan no longer exists (dangling references are handled later).
	 */
	public refresh(node: SubplanNode): SubplanNode
	{
		return this.rebuild(node, node.buildCount);
	}

	/**
	 * The same node built a different number of times - its interface is
	 * re-read from the subplan and multiplied by the new count. The subplan
	 * itself is left untouched: building it twice does not change what is
	 * inside it.
	 */
	public withBuildCount(node: SubplanNode, buildCount: number): SubplanNode
	{
		return this.rebuild(node, buildCount);
	}

	/** Build counts are whole blueprints - never a fraction, never less than one. */
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
		const inputs = new Map<string, number>();
		const outputs = new Map<string, number>();

		(graph?.nodes ?? []).forEach(node => {
			// Raw JSON nodes carry itemClassName, hydrated ones an item entity.
			const raw = node as unknown as {type?: string; amount?: number; itemClassName?: string; item?: {className: string}};
			const itemClassName = raw.item?.className ?? raw.itemClassName;
			const amount = raw.amount ?? 0;
			if (!itemClassName || amount <= 0) {
				return;
			}
			if (raw.type === 'input') {
				inputs.set(itemClassName, (inputs.get(itemClassName) ?? 0) + amount);
			} else if (raw.type === 'product' || raw.type === 'byproduct') {
				outputs.set(itemClassName, (outputs.get(itemClassName) ?? 0) + amount);
			}
		});

		return {inputs: this.toNodeIO(inputs), outputs: this.toNodeIO(outputs)};
	}

	private rebuild(node: SubplanNode, buildCount: number): SubplanNode
	{
		const count = this.normalizeBuildCount(buildCount);
		const plan = this.planManager.findPlan(node.subplanId);
		if (!plan) {
			return node;
		}
		const io = this.resolveGraph(plan.graph);
		const inputs = this.scaled(io.inputs, count);
		const outputs = this.scaled(io.outputs, count);
		if (plan.name === node.name && count === node.buildCount
			&& this.sameIO(node.inputs, inputs) && this.sameIO(node.outputs, outputs)) {
			return node;
		}
		const refreshed = new SubplanNode(node.id, node.subplanId, plan.name, inputs, outputs, count);
		refreshed.x = node.x;
		refreshed.y = node.y;
		refreshed.done = node.done;
		return refreshed;
	}

	private scaled(io: NodeIO[], factor: number): NodeIO[]
	{
		return factor === 1 ? io : io.map(entry => new NodeIO(entry.item, entry.maxAmount * factor));
	}

	private toNodeIO(amounts: Map<string, number>): NodeIO[]
	{
		const data = this.versionManager.activeVersionData();
		if (!data) {
			return [];
		}
		return [...amounts.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([className, amount]) => new NodeIO(data.getItemByClassName(className), amount));
	}

	private sameIO(a: NodeIO[], b: NodeIO[]): boolean
	{
		if (a.length !== b.length) {
			return false;
		}
		const byClassName = new Map(a.map(io => [io.item.className, io.maxAmount]));
		return b.every(io => byClassName.get(io.item.className) === io.maxAmount);
	}

}
