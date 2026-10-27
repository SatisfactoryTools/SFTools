import {MapCategoryGroup} from '@src/Model/Map/MapCategoryGroup';
import {MapLayerId} from '@src/Model/Map/MapLayerId';

export class MapLayer
{

	public constructor(
		public readonly id: MapLayerId,
		public readonly label: string,
		public readonly count: number | null,
		public readonly groups: MapCategoryGroup[],
		/** Shown as a spinner while the layer is on. */
		public readonly loading: boolean = count === null,
	)
	{
	}

}
