import {Item} from '@src/Model/Data/Entities/Item';
import {Node} from '@src/Model/Planner/Solver/Response/Node';

export abstract class ItemAmountNode extends Node
{

	public constructor(id: string, amount: number, public readonly item: Item)
	{
		super(id, amount);
		this.setupIO();
	}

	public getDisplayName(): string
	{
		return this.item.name;
	}

}
