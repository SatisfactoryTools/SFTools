/**
 * How many nodes each split of the right-clicked node would produce. 1 means
 * there is nothing to split that way, and the entry renders grayed out.
 */
export interface NodeSplitOptions
{
	readonly inputs: number;
	readonly outputs: number;
	readonly both: number;
}
