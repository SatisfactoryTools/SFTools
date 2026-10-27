import {MapCoordinateUnit} from '@src/Model/Settings/MapCoordinateUnit';

/** Everything on the map is kept in engine units; only what people read or type is in the chosen ones. */
export class MapCoordinateFormatter
{

	private static readonly ENGINE_PER_GAME = 100;

	private readonly numbers = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0});

	public constructor(private readonly unit: MapCoordinateUnit = 'game')
	{
	}

	public format(engine: number): string
	{
		return this.numbers.format(this.unit === 'game' ? engine / MapCoordinateFormatter.ENGINE_PER_GAME : engine);
	}

	public toEngine(value: number): number
	{
		return this.unit === 'game' ? value * MapCoordinateFormatter.ENGINE_PER_GAME : value;
	}

}
