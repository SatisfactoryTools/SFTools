export class MapView
{

	public constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly zoom: number,
	)
	{
	}

	public static parse(value: string | null): MapView | null
	{
		if (value === null || value === '') {
			return null;
		}
		const parts = value.split(',').map(part => Number(part));
		if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) {
			return null;
		}
		return new MapView(parts[0], parts[1], parts[2]);
	}

	public toString(): string
	{
		// Whole metres and quarter zoom steps are finer than anything a link needs, and keep URLs short.
		return `${Math.round(this.x / 100) * 100},${Math.round(this.y / 100) * 100},${Math.round(this.zoom * 4) / 4}`;
	}

	public equals(other: MapView | null): boolean
	{
		return other !== null && this.toString() === other.toString();
	}

}
