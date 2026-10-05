import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export abstract class Node
{

	public inputs: NodeIO[] = [];
	public outputs: NodeIO[] = [];
	public x: number = 0;
	public y: number = 0;

	/** The solver builds around locked nodes and never replaces them. */
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

	protected serializeFlags(): {locked?: true; done?: true}
	{
		return {
			...(this.locked ? {locked: true as const} : {}),
			...(this.done ? {done: true as const} : {}),
		};
	}

}
