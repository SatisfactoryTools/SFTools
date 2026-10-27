import {MapCategory} from '@src/Model/Map/MapCategory';
import {MapPurityColumn} from '@src/Model/Map/MapPurityColumn';

export class MapCategoryGroup
{

	public constructor(
		public readonly label: string,
		public readonly categories: MapCategory[],
		public readonly columns: MapPurityColumn[] = [],
	)
	{
	}

}
