export interface FactorySiteResourceUse
{
	readonly className: string;
	/** Indexes into the resource's node list, nearest first. */
	readonly nodes: number[];
	/** World units, before the fluid factor. */
	readonly farthest: number;
	readonly total: number;
}
