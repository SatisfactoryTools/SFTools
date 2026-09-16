/** One per-generator clock-speed override for the solver (Overclocking tab row). */
export interface GeneratorClockSpeed
{

	generatorClassName: string;

	/** Clock speed in percent (1–250). */
	clockSpeed: number;

}
