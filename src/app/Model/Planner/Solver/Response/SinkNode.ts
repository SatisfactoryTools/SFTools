import {Formulas} from '@src/Model/Planner/Formulas';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/**
 * One AWESOME Sink node consuming a single item at a fixed rate for sink
 * points. Each sinked item gets its own sink node rather than one aggregate
 * node collecting them all.
 */
export class SinkNode extends ItemAmountNode
{

	public readonly type = 'sink' as const;

	protected setupIO(): void
	{
		this.inputs.push(new NodeIO(this.item, this.amount));
	}

	/** Sink points earned per minute for this item at this rate. */
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
			...this.serializeLock(),
		};
	}

}
