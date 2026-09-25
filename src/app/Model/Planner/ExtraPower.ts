import {AlienPowerAugmenters} from '@src/Model/Planner/AlienPowerAugmenters';
import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';

/** Average MW one Geothermal Generator makes, by the purity of its geyser. */
const GEOTHERMAL_AVERAGE: GeothermalGenerators = {impure: 100, normal: 200, pure: 400};

/** A geyser swings between half and one and a half times its average. */
const GEOTHERMAL_SWING = 0.5;

/** Flat MW one Alien Power Augmenter adds before any percentage is applied. */
const AUGMENTER_FLAT = 500;

/** Share of all generated power one augmenter adds on top, plain and boosted. */
const AUGMENTER_SHARE = 0.1;
const BOOSTED_SHARE = 0.3;

/** Somersloops one augmenter costs to build. */
const AUGMENTER_SLOOPS = 10;

/** Alien Power Matrix per minute one boosted augmenter burns. */
const BOOSTED_MATRIX_RATE = 5;

/**
 * The power a plan gets from buildings that sit outside the production graph:
 * Geothermal Generators on the map's geysers and Alien Power Augmenters. The
 * counts come from the plan's settings, so nothing here is the solver's
 * choice - it is a fixed amount of power the rest of the plan is built around.
 *
 * Both flat parts (geysers and the augmenters' own MW) are added first, and
 * the augmenters then raise that whole sum by their percentage.
 */
export class ExtraPower
{

	/** No geysers - the base for an augmenter-only setup. */
	public static readonly NO_GEYSERS: GeothermalGenerators = {impure: 0, normal: 0, pure: 0};

	public static readonly NONE = new ExtraPower(ExtraPower.NO_GEYSERS, {count: 0, boosted: 0});

	/** Just the augmenters, for what a node or a single building contributes. */
	public static forAugmenters(count: number, boosted: number): ExtraPower
	{
		return new ExtraPower(ExtraPower.NO_GEYSERS, {count, boosted});
	}

	/** Just the geysers of one purity, for a per-purity breakdown row. */
	public static forGeysers(geysers: GeothermalGenerators): ExtraPower
	{
		return new ExtraPower(geysers, {count: 0, boosted: 0});
	}

	/**
	 * `oneOffs` off means the geysers, the flat MW and the matrix fuel are
	 * already accounted for elsewhere and only the percentage is left - see
	 * `percentageOnly()`.
	 */
	public constructor(
		public readonly geysers: GeothermalGenerators,
		public readonly augmenters: AlienPowerAugmenters,
		private readonly oneOffs: boolean = true,
	)
	{
	}

	/** Whether anything here changes the plan's power at all. */
	public get isActive(): boolean
	{
		return this.geothermalCount > 0 || this.augmenters.count > 0;
	}

	public get geothermalCount(): number
	{
		return this.geysers.impure + this.geysers.normal + this.geysers.pure;
	}

	/** What the geothermal generators make, with the band they oscillate in. */
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

	/** The augmenters' own MW, added before the percentage. */
	public get flatBonus(): number
	{
		return this.oneOffs ? this.augmenters.count * AUGMENTER_FLAT : 0;
	}

	/** What everything generated is multiplied by: 1 with no augmenters. */
	public get multiplier(): number
	{
		const plain = this.augmenters.count - this.augmenters.boosted;
		return 1 + plain * AUGMENTER_SHARE + this.augmenters.boosted * BOOSTED_SHARE;
	}

	/** The percentage the augmenters add, as a whole number for display. */
	public get bonusPercent(): number
	{
		return (this.multiplier - 1) * 100;
	}

	/** Somersloops the augmenters take out of the plan's budget. */
	public get sloopCost(): number
	{
		return this.augmenters.count * AUGMENTER_SLOOPS;
	}

	/** Alien Power Matrix per minute the boosted augmenters burn. */
	public get matrixDemand(): number
	{
		return this.oneOffs ? this.augmenters.boosted * BOOSTED_MATRIX_RATE : 0;
	}

	/**
	 * The MW this setup adds on top of `generated` MW of ordinary generators:
	 * the geothermal power plus everything the augmenters contribute.
	 */
	public bonus(generated: number): PowerDraw
	{
		return this.geothermalPower.add(this.augmenterBonus(generated));
	}

	/**
	 * The augmenters' share alone: their own flat MW raised by the
	 * percentage, plus that percentage applied to the generators and the
	 * geothermal power. Counting the geysers themselves is `geothermalPower`.
	 */
	public augmenterBonus(generated: number): PowerDraw
	{
		if (this.augmenters.count === 0) {
			return PowerDraw.ZERO;
		}
		return PowerDraw.fixed(this.flatBonus * this.multiplier)
			.add(this.geothermalPower.add(PowerDraw.fixed(generated)).scale(this.multiplier - 1));
	}

	/**
	 * The same setup with its one-off parts spent: the geysers, the flat MW
	 * and the matrix fuel are already in the plan, only the percentage still
	 * applies. The maximise loop builds everything once in its first round
	 * and uses this for the rounds after it.
	 */
	public percentageOnly(): ExtraPower
	{
		return new ExtraPower(this.geysers, this.augmenters, false);
	}

}
