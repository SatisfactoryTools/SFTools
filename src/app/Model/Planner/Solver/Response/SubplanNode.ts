import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/**
 * A subplan embedded in its parent plan's graph. Behaves as a permanently
 * locked node: it requires the subplan's input-node items and provides its
 * product and byproduct items, so the parent solver hooks the subplan into
 * the production without ever replacing it. The IO is refreshed from the
 * subplan's current graph whenever the parent plan is rendered (see
 * SubplanIOResolver).
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
			inputs: this.inputs.map(io => ({itemClassName: io.item.className, amount: io.maxAmount})),
			outputs: this.outputs.map(io => ({itemClassName: io.item.className, amount: io.maxAmount})),
			x: this.x,
			y: this.y,
			locked: true,
		};
	}

}
