import {AlienPowerAugmenters} from '@src/Model/Planner/AlienPowerAugmenters';
import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';

const GEOTHERMAL_AVERAGE: GeothermalGenerators = {impure: 100, normal: 200, pure: 400};

const GEOTHERMAL_SWING = 0.5;

const AUGMENTER_FLAT = 500;

const AUGMENTER_SHARE = 0.1;
const BOOSTED_SHARE = 0.3;

const AUGMENTER_SLOOPS = 10;

const BOOSTED_MATRIX_RATE = 5;

export class ExtraPower
{

	public static readonly NO_GEYSERS: GeothermalGenerators = {impure: 0, normal: 0, pure: 0};

	public static readonly NONE = new ExtraPower(ExtraPower.NO_GEYSERS, {count: 0, boosted: 0});

	public static forAugmenters(count: number, boosted: number): ExtraPower
	{
		return new ExtraPower(ExtraPower.NO_GEYSERS, {count, boosted});
	}

	public static forGeysers(geysers: GeothermalGenerators): ExtraPower
	{
		return new ExtraPower(geysers, {count: 0, boosted: 0});
	}

	public constructor(
		public readonly geysers: GeothermalGenerators,
		public readonly augmenters: AlienPowerAugmenters,
		private readonly oneOffs: boolean = true,
	)
	{
	}

	public get isActive(): boolean
	{
		return this.geothermalCount > 0 || this.augmenters.count > 0;
	}

	public get geothermalCount(): number
	{
		return this.geysers.impure + this.geysers.normal + this.geysers.pure;
	}

	public get geothermalPower(): PowerDraw
	{
		if (!this.oneOffs) {
			return PowerDraw.ZERO;
		}
		const average = this.geysers.impure * GEOTHERMAL_AVERAGE.impure
			+ this.geysers.normal * GEOTHERMAL_AVERAGE.normal
			+ this.geysers.pure * GEOTHERMAL_AVERAGE.pure;
		return PowerDraw.between(average * (1 - GEOTHERMAL_SWING), average * (1 + GEOTHERMAL_SWING));
	}

	public get flatBonus(): number
	{
		return this.oneOffs ? this.augmenters.count * AUGMENTER_FLAT : 0;
	}

	public get multiplier(): number
	{
		const plain = this.augmenters.count - this.augmenters.boosted;
		return 1 + plain * AUGMENTER_SHARE + this.augmenters.boosted * BOOSTED_SHARE;
	}

	public get bonusPercent(): number
	{
		return (this.multiplier - 1) * 100;
	}

	public get sloopCost(): number
	{
		return this.augmenters.count * AUGMENTER_SLOOPS;
	}

	public get matrixDemand(): number
	{
		return this.oneOffs ? this.augmenters.boosted * BOOSTED_MATRIX_RATE : 0;
	}

	public bonus(generated: number): PowerDraw
	{
		return this.geothermalPower.add(this.augmenterBonus(generated));
	}

	public augmenterBonus(generated: number): PowerDraw
	{
		if (this.augmenters.count === 0) {
			return PowerDraw.ZERO;
		}
		return PowerDraw.fixed(this.flatBonus * this.multiplier)
			.add(this.geothermalPower.add(PowerDraw.fixed(generated)).scale(this.multiplier - 1));
	}

	/** The maximise loop builds the one-off parts in its first round and uses this for the rounds after. */
	public percentageOnly(): ExtraPower
	{
		return new ExtraPower(this.geysers, this.augmenters, false);
	}

}
