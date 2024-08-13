import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export class MineNode extends ItemAmountNode
{

	public readonly type = 'mine' as const;

	protected setupIO(): void
	{
		this.outputs.push(new NodeIO(this.item, this.amount));
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
