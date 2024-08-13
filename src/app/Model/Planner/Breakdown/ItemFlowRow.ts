/** One producer or consumer of an item in the items panel (a source or target). */
export interface ItemFlowRow
{

	readonly key: string;

	readonly name: string;

	/** Per-minute rate. */
	readonly amount: number;

}
