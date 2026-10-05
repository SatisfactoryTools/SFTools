import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/** Permanently locked. Its IO is refreshed from the subplan's graph whenever the parent is rendered (see SubplanIOResolver) and is already multiplied by `buildCount`. */
export class SubplanNode extends Node
{

	public readonly type = 'subplan' as const;

	public constructor(
		id: string,
		public readonly subplanId: string,
		public readonly name: string,
		inputs: NodeIO[],
		outputs: NodeIO[],
		/** Whole number, at least 1. */
		public readonly buildCount: number = 1,
	)
	{
		super(id, 1);
		this.inputs = inputs;
		this.outputs = outputs;
		this.locked = true;
	}

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
			...this.serializeFlags(),
			locked: true,
		};
	}

}
