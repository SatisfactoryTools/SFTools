import {MapLayerId} from '@src/Model/Map/MapLayerId';

export class CollectibleKind
{

	public constructor(
		public readonly layer: MapLayerId,
		public readonly category: string | null,
		public readonly group: string,
		public readonly categoryLabel: string,
		public readonly itemClass: string | null,
		public readonly mapIcon: string | null,
		public readonly fallbackIcon: string | null,
		public readonly label: string,
		public readonly description: string,
		public readonly color: string,
	)
	{
	}

}
