export interface MachineGroup
{

	readonly machines: number;

	/** Percent, at most 4 decimal digits. */
	readonly clockSpeed: number;

	readonly sloops: number;

}
