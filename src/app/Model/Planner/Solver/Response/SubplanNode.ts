import {SubplanSizing} from '@src/Model/Planner/SubplanSizing';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export class SubplanNode extends Node
{

	public readonly type = 'subplan' as const;

	/** Idle: the parent's calculation uses none of it, so the node has no inputs or outputs while the subplan keeps its size. */
	public constructor(
		id: string,
		public readonly subplanId: string,
		public readonly name: string,
		inputs: NodeIO[],
		outputs: NodeIO[],
		public readonly buildCount: number = 1,
		public readonly sizing: SubplanSizing = 'follows',
		public readonly idle: boolean = false,
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

	/** How many times the subplan is built here; an idle node builds none. */
	public builds(): number
	{
		return this.idle ? 0 : Math.max(1, this.buildCount);
	}

	/** Always locked: the calculation builds the rest of the plan around a subplan. */
	public override canToggleLock(): boolean
	{
		return false;
	}

	public toJSON(): object
	{
		return {
			type: this.type,
			id: this.id,
			subplanId: this.subplanId,
			name: this.name,
			buildCount: this.buildCount,
			sizing: this.sizing,
			...(this.idle ? {idle: true} : {}),
			inputs: this.inputs.map(io => ({itemClassName: io.item.className, amount: io.maxAmount})),
			outputs: this.outputs.map(io => ({itemClassName: io.item.className, amount: io.maxAmount})),
			x: this.x,
			y: this.y,
			...this.serializeFlags(),
			locked: true,
		};
	}

}
