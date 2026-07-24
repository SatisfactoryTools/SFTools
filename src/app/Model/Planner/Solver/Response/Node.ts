import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export abstract class Node
{

	public inputs: NodeIO[] = [];
	public outputs: NodeIO[] = [];
	public x: number = 0;
	public y: number = 0;

	/** Locked nodes are user-owned: the solver builds around them and never replaces them. */
	public locked = false;

	/** Done nodes are already built in the game - a purely visual progress marker. */
	public done = false;

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

	/** Spread into subclass toJSON() results; omits unset flags entirely. */
	protected serializeFlags(): {locked?: true; done?: true}
	{
		return {
			...(this.locked ? {locked: true as const} : {}),
			...(this.done ? {done: true as const} : {}),
		};
	}

}
