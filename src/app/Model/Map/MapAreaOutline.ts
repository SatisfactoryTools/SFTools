/** A resource area drawn on the map: the target's own, or one of the plans in its folder. */
export interface MapAreaOutline
{
	readonly id: string;
	/** World X/Y corners. */
	readonly points: ReadonlyArray<readonly [number, number]>;
	readonly color: string;
	/** Shown on hover; null for the target's own area. */
	readonly label: string | null;
	readonly primary: boolean;
}
