/**
 * The `metadata.world` object of a version data file. Custom versions store
 * the worldData the frontend sent on create (including the derived limits);
 * official versions store the generator's raw output and carry no limits.
 * Only the keys the frontend consumes are typed here.
 */
export interface VersionWorldMetadata
{
	/** Frontend-derived per-minute resource caps (custom versions only). */
	readonly limits?: Record<string, number>;
}
