import {MapPurity} from '@src/Model/Map/MapPurity';

export class MapCategoryPurity
{

	public constructor(
		public readonly id: string,
		public readonly purity: MapPurity,
		public readonly label: string,
		public readonly count: number,
	)
	{
	}

}
