/**
 * A power figure in MW together with the band it oscillates in. Fixed-draw
 * machines have min = average = max; variable-draw recipes (Converter,
 * Particle Accelerator, Quantum Encoder) swing between min and max and count
 * as their average everywhere a single number is needed - the solver, the
 * totals, the sorting. Immutable: arithmetic returns new instances, so sums
 * and differences keep their bands (a difference's band is the widest one).
 */
export class PowerDraw
{

	public static readonly ZERO = new PowerDraw(0, 0, 0);

	public constructor(
		public readonly average: number,
		public readonly min: number,
		public readonly max: number,
	)
	{
	}

	public static fixed(megawatts: number): PowerDraw
	{
		return new PowerDraw(megawatts, megawatts, megawatts);
	}

	/** A uniform oscillation between min and max, counting as their midpoint. */
	public static between(min: number, max: number): PowerDraw
	{
		return new PowerDraw((min + max) / 2, min, max);
	}

	public static sum(draws: readonly PowerDraw[]): PowerDraw
	{
		return draws.reduce((total, draw) => total.add(draw), PowerDraw.ZERO);
	}

	/** Whether the band is wider than float noise - the only case worth showing a range for. */
	public isVariable(): boolean
	{
		return this.max - this.min > 1e-9;
	}

	public add(other: PowerDraw): PowerDraw
	{
		return new PowerDraw(this.average + other.average, this.min + other.min, this.max + other.max);
	}

	public subtract(other: PowerDraw): PowerDraw
	{
		return new PowerDraw(this.average - other.average, this.min - other.max, this.max - other.min);
	}

	public scale(factor: number): PowerDraw
	{
		const a = this.min * factor;
		const b = this.max * factor;
		return new PowerDraw(this.average * factor, Math.min(a, b), Math.max(a, b));
	}

	public negate(): PowerDraw
	{
		return new PowerDraw(-this.average, -this.max, -this.min);
	}

}
