import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/**
 * A power generator burning one specific fuel. `amount` is the (fractional)
 * number of generators, each running at `clockSpeed`; the IO covers the fuel,
 * the supplemental fluid and the burn byproduct - power itself is not an item
 * and shows only in the node's stats.
 */
export class GeneratorNode extends Node
{

	public readonly type = 'generator' as const;

	/**
	 * @param clockSpeed Percent, 1–250. Power and fuel scale with it in step,
	 *                   so it only decides how many buildings (and power
	 *                   shards) the same generation takes.
	 */
	public constructor(
		id: string,
		amount: number,
		public readonly generator: Building,
		public readonly fuel: Fuel,
		public readonly clockSpeed: number = 100,
	)
	{
		super(id, amount);
		this.setupIO();
	}

	/** MW produced by this node. */
	public powerProduction(): number
	{
		return Formulas.generatorPowerProduction(this.generator, this.amount, this.clockSpeed);
	}

	/** Whole power shards this node's generators need; 0 at or below 100%. */
	public powerShards(): number
	{
		return this.wholeGenerators() * Formulas.powerShards(this.clockSpeed);
	}

	/** Generator counts are fractional - building them takes whole machines. */
	public wholeGenerators(): number
	{
		return Math.ceil(this.amount - 1e-9);
	}

	protected setupIO(): void
	{
		const burn = Formulas.generatorBurnRate(this.generator, this.fuel, this.clockSpeed) * this.amount;
		this.inputs.push(new NodeIO(this.fuel.item, burn));
		if (this.fuel.supplementalItem !== null) {
			this.inputs.push(new NodeIO(
				this.fuel.supplementalItem,
				Formulas.generatorSupplementalRate(this.generator, this.clockSpeed) * this.amount,
			));
		}
		if (this.fuel.byproduct !== null) {
			this.outputs.push(new NodeIO(this.fuel.byproduct, burn * this.fuel.byproductAmount));
		}
	}

	public getDisplayName(): string
	{
		return this.generator.name;
	}

	public toJSON(): object
	{
		return {
			type: this.type,
			id: this.id,
			generatorClassName: this.generator.className,
			fuelItemClassName: this.fuel.item.className,
			amount: this.amount,
			// Omitted at 100% - plans saved before generator clocking read back unchanged.
			...(this.clockSpeed === 100 ? {} : {clockSpeed: this.clockSpeed}),
			x: this.x,
			y: this.y,
			...this.serializeFlags(),
		};
	}

}
