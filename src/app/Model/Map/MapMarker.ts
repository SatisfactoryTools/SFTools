import {MapLayerId} from '@src/Model/Map/MapLayerId';
import {MapMarkerKind} from '@src/Model/Map/MapMarkerKind';
import {MapPurity} from '@src/Model/Map/MapPurity';
import {MapUnlockCost} from '@src/Model/Map/MapUnlockCost';

export class MapMarker
{

	public constructor(
		public readonly id: string,
		public readonly layer: MapLayerId,
		public readonly categories: string[],
		public readonly groupKey: string | null,
		public readonly groupLabel: string,
		public readonly section: string,
		public readonly iconUrl: string | null,
		public readonly kind: MapMarkerKind,
		public readonly title: string,
		public readonly description: string,
		public readonly color: string,
		public readonly purity: MapPurity | null,
		public readonly x: number,
		public readonly y: number,
		public readonly z: number,
		public readonly amount: number | null = null,
		/** An extractor stands on it in the player's game. */
		public readonly taken: boolean = false,
		/** Picked up or looted in the player's game. */
		public readonly collected: boolean = false,
		/** Crash sites: what opening it takes, when the data says. */
		public readonly unlock: MapUnlockCost | null = null,
	)
	{
	}

}
