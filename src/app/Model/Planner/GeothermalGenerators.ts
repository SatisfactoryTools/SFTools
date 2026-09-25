/**
 * Geysers the plan builds a Geothermal Generator on, by geyser purity. The
 * map only has so many of each, so the Power tab caps these at the version's
 * world data - a version without world data leaves them free.
 */
export interface GeothermalGenerators
{

	readonly impure: number;

	readonly normal: number;

	readonly pure: number;

}
