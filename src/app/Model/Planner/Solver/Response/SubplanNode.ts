import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/**
 * A subplan embedded in its parent plan's graph. Behaves as a permanently
 * locked node: it requires the subplan's input-node items and provides its
 * product and byproduct items, so the parent solver hooks the subplan into
 * the production without ever replacing it. The IO is refreshed from the
 * subplan's current graph whenever the parent plan is rendered (see
 * SubplanIOResolver).
 *
 * `buildCount` is how many times the whole subplan is built here - a
 * blueprint placed several times. The inside of the subplan stays as it is;
 * the node's IO carried here is already multiplied by the count, so the
 * calculation, the edges and every panel see the full amounts.
 */
export class SubplanNode extends Node
{

	public readonly type = 'subplan' as const;

	public constructor(
		id: string,
		public readonly subplanId: string,
		public readonly name: string,
		inputs: NodeIO[],
		outputs: NodeIO[],
		/** How many times the subplan is built here; a whole number, at least 1. */
		public readonly buildCount: number = 1,
	)
	{
		super(id, 1);
		this.inputs = inputs;
		this.outputs = outputs;
		this.locked = true;
	}

	/** IO comes from the subplan's graph, passed through the constructor. */
	protected setupIO(): void
	{
	}

	public getDisplayName(): string
	{
		return this.name;
	}

	public toJSON(): object
	{
		return {
			type: this.type,
			id: this.id,
			subplanId: this.subplanId,
			name: this.name,
			buildCount: this.buildCount,
			inputs: this.inputs.map(io => ({itemClassName: io.item.className, amount: io.maxAmount})),
			outputs: this.outputs.map(io => ({itemClassName: io.item.className, amount: io.maxAmount})),
			x: this.x,
			y: this.y,
			// Subplan nodes are always locked, so the flag is unconditional here.
			...this.serializeFlags(),
			locked: true,
		};
	}

}
