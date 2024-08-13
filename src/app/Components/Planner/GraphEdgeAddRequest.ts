/** A user-drawn connection between two existing nodes, already normalized to flow direction. */
export interface GraphEdgeAddRequest
{
	readonly sourceId: string;
	readonly targetId: string;
	readonly itemClassName: string;
	/** Client coordinates of the drop, anchoring follow-up popups (e.g. the shortage menu). */
	readonly clientX: number;
	readonly clientY: number;
}
