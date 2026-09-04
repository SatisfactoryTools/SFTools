/** One per-machine clock-speed override for the solver (Overclocking tab row). */
export interface MachineClockSpeed
{

	machineClassName: string;

	/** Clock speed in percent (1–250). */
	clockSpeed: number;

}
