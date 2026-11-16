/** The fastest belt and pipe, by mark: one extractor feeds one of each, so they cap what a node gives on the map. */
export interface MapConveyors
{
	readonly beltMark: number;
	readonly pipeMark: number;

	/** Miner used on solid nodes; absent in settings saved before it could be picked, which means the best one. */
	readonly minerMark?: number;
}
