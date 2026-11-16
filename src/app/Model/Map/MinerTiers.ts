export class MinerTiers
{

	/** Output relative to a Miner Mk.3: each mark doubles the one before it. */
	public static readonly MULTIPLIERS: ReadonlyArray<number> = [0.25, 0.5, 1];

	// Stored marks outlive the list: an unknown one falls back to the best miner.
	public static multiplier(mark: number | undefined): number
	{
		return MinerTiers.MULTIPLIERS[(mark ?? MinerTiers.MULTIPLIERS.length) - 1] ?? MinerTiers.MULTIPLIERS[MinerTiers.MULTIPLIERS.length - 1];
	}

}
