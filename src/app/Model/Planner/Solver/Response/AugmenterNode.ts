import {Building} from '@src/Model/Data/Entities/Building';
import {ExtraPower} from '@src/Model/Planner/ExtraPower';
import {Item} from '@src/Model/Data/Entities/Item';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/**
 * The plan's Alien Power Augmenters as one graph node, so the Alien Power
 * Matrix the boosted ones burn can be wired up like any other item flow.
 * `amount` is how many are built, `boosted` how many of them run on matrix.
 *
 * It is a picture of the Power tab's setting rather than something the solver
 * chose: the solver rebuilds it from `alienPowerAugmenters` on every solve,
 * which is also why the power totals are read from the settings (see
 * ExtraPower) and not from this node - so nothing counts the augmenters
 * twice. The node carries the matrix flow, nothing else.
 */
export class AugmenterNode extends Node
{

	public readonly type = 'augmenter' as const;

	public constructor(
		id: string,
		amount: number,
		public readonly boosted: number,
		public readonly building: Building,
		/** Null when the version has no Alien Power Matrix - then nothing is burned. */
		public readonly matrixItem: Item | null,
	)
	{
		super(id, amount);
		this.setupIO();
	}

	/** What these augmenters add to the plan's power, on their own. */
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
