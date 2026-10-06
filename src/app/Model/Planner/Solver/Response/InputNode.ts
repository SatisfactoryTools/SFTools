import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export class InputNode extends ItemAmountNode
{

	public readonly type = 'input' as const;

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
			...this.serializeFlags(),
		};
	}

}
