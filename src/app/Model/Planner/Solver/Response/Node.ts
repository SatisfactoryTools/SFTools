import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export abstract class Node
{

	public inputs: NodeIO[] = [];
	public outputs: NodeIO[] = [];
	public x: number = 0;
	public y: number = 0;

	/** Locked nodes are user-owned: the solver builds around them and never replaces them. */
	public locked = false;

	public abstract readonly type: string;

	protected constructor(
		public readonly id: string,
		public readonly amount: number,
	)
	{
	}

	protected abstract setupIO(): void;

	public abstract getDisplayName(): string;

	public abstract toJSON(): object;

	/** Spread into subclass toJSON() results; omits the key entirely when unlocked. */
	protected serializeLock(): {locked?: true}
	{
		return this.locked ? {locked: true} : {};
	}

}
