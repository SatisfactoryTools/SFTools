export interface MachineGroup
{

	/** Whole number of machines in this group (>= 1). */
	readonly machines: number;

	/** Clock speed percent, 1.0–250.0, at most 4 decimal digits. */
	readonly clockSpeed: number;

	/** Somersloops per machine, 0..machine.sloopSlots. */
	readonly sloops: number;

}
