import {MapLayerId} from '@src/Model/Map/MapLayerId';

/** A map landing page: the map opened with one thing shown. Texts carry `{V}` for the version name. */
export class MapTopic
{

	/** @param shownCategories null shows the whole layer; otherwise the layer's other categories start hidden */
	public constructor(
		public readonly slug: string,
		public readonly label: string,
		public readonly heading: string,
		public readonly description: string,
		public readonly layer: MapLayerId,
		public readonly shownCategories: ReadonlyArray<string> | null = null,
	)
	{
	}

}
