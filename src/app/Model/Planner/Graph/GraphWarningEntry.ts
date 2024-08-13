/** One warning-bearing node of the rendered graph, ready for list display. */
export interface GraphWarningEntry
{

	readonly nodeId: string;

	readonly nodeName: string;

	/** Human-readable description of each warning on the node. */
	readonly lines: string[];

}
