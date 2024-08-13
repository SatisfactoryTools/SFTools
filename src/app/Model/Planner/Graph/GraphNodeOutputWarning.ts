export interface GraphNodeOutputWarning
{

	readonly itemClassName: string;
	/** Rate per minute the node produces of this item. */
	readonly produced: number;
	/** Rate per minute actually carried away by outgoing edges. */
	readonly consumed: number;

}
