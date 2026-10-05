import {Building} from '@src/Model/Data/Entities/Building';
import {ExtraPower} from '@src/Model/Planner/ExtraPower';
import {Item} from '@src/Model/Data/Entities/Item';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/** A picture of the Power tab's setting, rebuilt on every solve. Power totals are read from the settings (see ExtraPower), not this node, so nothing counts the augmenters twice - the node only carries the matrix flow. */
export class AugmenterNode extends Node
{

	public readonly type = 'augmenter' as const;

	public constructor(
		id: string,
		amount: number,
		public readonly boosted: number,
		public readonly building: Building,
		/** Null when the version has no Alien Power Matrix. */
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
