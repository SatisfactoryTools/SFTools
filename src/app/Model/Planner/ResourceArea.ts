export interface ResourceArea
{
	/** World X/Y, rounded to whole units. */
	readonly points: [number, number][];
	/** Off: water is unlimited, as a water extractor fits on any lake. */
	readonly waterWells: boolean;
}
