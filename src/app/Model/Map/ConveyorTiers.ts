export class ConveyorTiers
{

	public static readonly BELTS: ReadonlyArray<number> = [60, 120, 270, 480, 780, 1200];
	public static readonly PIPES: ReadonlyArray<number> = [300, 600];

	public static belt(mark: number): number
	{
		return ConveyorTiers.rate(ConveyorTiers.BELTS, mark);
	}

	public static pipe(mark: number): number
	{
		return ConveyorTiers.rate(ConveyorTiers.PIPES, mark);
	}

	// Stored marks outlive the lists: an unknown one falls back to the fastest tier.
	private static rate(tiers: ReadonlyArray<number>, mark: number): number
	{
		return tiers[mark - 1] ?? tiers[tiers.length - 1];
	}

}
