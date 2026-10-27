export class MapDistanceFormatter
{

	/** World units are centimetres. */
	public format(units: number): string
	{
		const metres = units / 100;
		if (metres < 1000) {
			return `${Math.round(metres)} m`;
		}
		return `${(metres / 1000).toFixed(metres < 10000 ? 1 : 0)} km`;
	}

}
