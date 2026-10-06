/** Variable-draw machines count as their average wherever a single number is needed; a difference's band is the widest one. */
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

	public static between(min: number, max: number): PowerDraw
	{
		return new PowerDraw((min + max) / 2, min, max);
	}

	public static sum(draws: readonly PowerDraw[]): PowerDraw
	{
		return draws.reduce((total, draw) => total.add(draw), PowerDraw.ZERO);
	}

	/** Wider than float noise. */
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
