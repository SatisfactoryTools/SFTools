export interface MapExportOptions
{
	/** Image pixels of the full-size map: the whole map, or what the view shows. */
	readonly bounds: readonly [number, number, number, number];
	/** Width of the exported picture. */
	readonly width: number;
}
