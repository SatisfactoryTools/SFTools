export interface GamePlayer
{
	readonly name: string | null;
	/** World X/Y/Z at the time of the save. */
	readonly location: [number, number, number];
}
