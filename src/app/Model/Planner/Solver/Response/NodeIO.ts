import {Item} from '@src/Model/Data/Entities/Item';

export class NodeIO
{

	public remaining: number;

	public constructor(
		public readonly item: Item,
		public readonly maxAmount: number,
	)
	{
		this.remaining = maxAmount;
	}

	public reset(): void
	{
		this.remaining = this.maxAmount;
	}

	public isDepleted(): boolean
	{
		return Math.abs(this.remaining) < 1e-6;
	}

}
