/** An image stretched over a world rectangle. */
export interface MapImageOverlay
{
	readonly url: string;
	readonly minX: number;
	readonly minY: number;
	readonly maxX: number;
	readonly maxY: number;
}
