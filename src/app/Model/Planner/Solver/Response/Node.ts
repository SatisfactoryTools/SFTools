import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export abstract class Node
{

	public inputs: NodeIO[] = [];
	public outputs: NodeIO[] = [];
	public x: number = 0;
	public y: number = 0;

	public locked = false;

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

	public canToggleLock(): boolean
	{
		return true;
	}

	protected serializeFlags(): {locked?: true; done?: true}
	{
		return {
			...(this.locked ? {locked: true as const} : {}),
			...(this.done ? {done: true as const} : {}),
		};
	}

}
