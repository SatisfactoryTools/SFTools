/** Resize a subplan node's subplan so the node's rates reach the asked-for size. */
export interface SubplanScaleRequest
{

	/** The subplan node in the open plan's graph, so its edges can be reconciled after the resize. */
	readonly nodeId: string;

	readonly subplanId: string;

	/** What to multiply everything in the subplan by; always greater than zero. */
	readonly factor: number;

}
