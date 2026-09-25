/**
 * Alien Power Augmenters the plan builds, and how many of them run boosted.
 * Each one costs somersloops, adds a flat amount of power and then raises
 * everything the plan generates by a percentage.
 */
export interface AlienPowerAugmenters
{

	/** Augmenters built in total; `boosted` of them run on Alien Power Matrix. */
	readonly count: number;

	/** How many of `count` are fed Alien Power Matrix for the larger percentage. */
	readonly boosted: number;

}
