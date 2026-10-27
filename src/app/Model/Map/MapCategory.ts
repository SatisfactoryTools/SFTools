import {MapCategoryPurity} from '@src/Model/Map/MapCategoryPurity';
import {MapMarkerShape} from '@src/Model/Map/MapMarkerShape';

export class MapCategory
{

	public constructor(
		public readonly key: string,
		public readonly label: string,
		public readonly color: string,
		public readonly shape: MapMarkerShape,
		public readonly iconUrl: string | null,
		public readonly count: number,
		public readonly ids: string[],
		public readonly purities: MapCategoryPurity[],
		/** How many are already collected in the player's game; null when nothing of it can be. */
		public readonly collected: number | null = null,
	)
	{
	}

	/** "12 / 66" left once a save says some are collected. */
	public get countText(): string
	{
		return this.collected === null || this.collected === 0 ? `${this.count}` : `${this.count - this.collected} / ${this.count}`;
	}

}
