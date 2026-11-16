/** What opening a crash site takes; no item and no power means it opens for free. */
export class MapUnlockCost
{

	public constructor(
		public readonly itemName: string | null,
		public readonly itemIconUrl: string | null,
		public readonly amount: number,
		/** MW, drawn the whole time the site is being opened. */
		public readonly power: number | null,
	)
	{
	}

}
