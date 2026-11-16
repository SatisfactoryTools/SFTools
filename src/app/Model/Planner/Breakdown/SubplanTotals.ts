export interface SubplanTotals
{

	/** Average power in MW. */
	readonly consumption: number;
	readonly production: number;

	readonly machines: number;

	readonly sloops: number;

	/** Raw resources mined per minute, by item class name. */
	readonly mines: Map<string, number>;

}
