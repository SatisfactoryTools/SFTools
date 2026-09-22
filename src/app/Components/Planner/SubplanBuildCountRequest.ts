/** Change how many times a subplan node builds its subplan. */
export interface SubplanBuildCountRequest
{

	/** The subplan node in the open plan's graph, so its edges can be reconciled afterwards. */
	readonly nodeId: string;

	/** How many times the subplan is built; a whole number, at least 1. */
	readonly buildCount: number;

}
