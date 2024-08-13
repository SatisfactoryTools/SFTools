/** One raw resource in the optimisation tab's weight list. */
export interface OptimisationResourceRow
{

	readonly className: string;
	readonly name: string;
	/** Effective weight (override or default). */
	readonly weight: number;
	readonly defaultWeight: number;

}
