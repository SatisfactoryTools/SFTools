import {Formulas} from '@src/Model/Planner/Formulas';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export class SinkNode extends ItemAmountNode
{

	public readonly type = 'sink' as const;

	protected setupIO(): void
	{
		this.inputs.push(new NodeIO(this.item, this.amount));
	}

	public sinkPoints(): number
	{
		return Formulas.sinkPoints(this.item, this.amount);
	}

	public override getDisplayName(): string
	{
		return 'AWESOME Sink';
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
