import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export class GeneratorNode extends Node
{

	public readonly type = 'generator' as const;

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

	public powerProduction(): number
	{
		return Formulas.generatorPowerProduction(this.generator, this.amount, this.clockSpeed);
	}

	public powerShards(): number
	{
		return this.wholeGenerators() * Formulas.powerShards(this.clockSpeed);
	}

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
