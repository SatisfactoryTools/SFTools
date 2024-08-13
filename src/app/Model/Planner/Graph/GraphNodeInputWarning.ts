export interface GraphNodeInputWarning
{

	readonly itemClassName: string;
	/** Rate per minute the node needs of this item. */
	readonly required: number;
	/** Rate per minute actually delivered by incoming edges. */
	readonly supplied: number;

}
