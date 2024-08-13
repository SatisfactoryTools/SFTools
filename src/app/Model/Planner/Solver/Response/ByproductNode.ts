import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export class ByproductNode extends ItemAmountNode
{

	public readonly type = 'byproduct' as const;

	protected setupIO(): void
	{
		this.inputs.push(new NodeIO(this.item, this.amount));
	}

	public toJSON(): object
	{
		return {
			type: this.type,
			id: this.id,
			itemClassName: this.item.className,
			amount: this.amount,
			x: this.x,
			y: this.y,
			...this.serializeLock(),
		};
	}

}
