import {MapPurity} from '@src/Model/Map/MapPurity';

export class MapPurityColumn
{

	public constructor(
		public readonly purity: MapPurity,
		public readonly label: string,
		public readonly ids: string[],
		public readonly count: number,
	)
	{
	}

}
