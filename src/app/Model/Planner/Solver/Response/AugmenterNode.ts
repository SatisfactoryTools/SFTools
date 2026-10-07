import {Building} from '@src/Model/Data/Entities/Building';
import {ExtraPower} from '@src/Model/Planner/ExtraPower';
import {Item} from '@src/Model/Data/Entities/Item';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/** Power totals come from the settings (ExtraPower), not this node, so the augmenters are never counted twice. */
export class AugmenterNode extends Node
{

	public readonly type = 'augmenter' as const;

	public constructor(
		id: string,
		amount: number,
		public readonly boosted: number,
		public readonly building: Building,
		public readonly matrixItem: Item | null,
	)
	{
		super(id, amount);
		this.setupIO();
	}

	public extraPower(): ExtraPower
	{
		return ExtraPower.forAugmenters(this.amount, this.boosted);
	}

	protected setupIO(): void
	{
		const rate = this.extraPower().matrixDemand;
		if (this.matrixItem !== null && rate > 0) {
			this.inputs.push(new NodeIO(this.matrixItem, rate));
		}
	}

	public getDisplayName(): string
	{
		return this.building.name;
	}

	/** Augmenters are driven by the Power tab settings, so locking them has no effect. */
	public override canToggleLock(): boolean
	{
		return false;
	}

	public toJSON(): object
	{
		return {
			type: this.type,
			id: this.id,
			buildingClassName: this.building.className,
			amount: this.amount,
			boosted: this.boosted,
			x: this.x,
			y: this.y,
			...this.serializeFlags(),
		};
	}

}
