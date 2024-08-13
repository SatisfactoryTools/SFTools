import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/**
 * A power generator burning one specific fuel. `amount` is the (fractional)
 * generator count at 100% clock; the IO covers the fuel, the supplemental
 * fluid and the burn byproduct - power itself is not an item and shows only
 * in the node's stats.
 */
export class GeneratorNode extends Node
{

	public readonly type = 'generator' as const;

	public constructor(
		id: string,
		amount: number,
		public readonly generator: Building,
		public readonly fuel: Fuel,
	)
	{
		super(id, amount);
		this.setupIO();
	}

	/** MW produced by this node. */
	public powerProduction(): number
	{
		return Formulas.generatorPowerProduction(this.generator, this.amount);
	}

	protected setupIO(): void
	{
		const burn = Formulas.generatorBurnRate(this.generator, this.fuel) * this.amount;
		this.inputs.push(new NodeIO(this.fuel.item, burn));
		if (this.fuel.supplementalItem !== null) {
			this.inputs.push(new NodeIO(this.fuel.supplementalItem, Formulas.generatorSupplementalRate(this.generator) * this.amount));
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
			x: this.x,
			y: this.y,
			...this.serializeLock(),
		};
	}

}
