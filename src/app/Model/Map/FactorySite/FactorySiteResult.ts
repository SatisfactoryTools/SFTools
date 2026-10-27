import {FactorySiteGrid} from '@src/Model/Map/FactorySite/FactorySiteGrid';
import {FactorySiteSpot} from '@src/Model/Map/FactorySite/FactorySiteSpot';
import {MapImageOverlay} from '@src/Model/Map/MapImageOverlay';

export interface FactorySiteResult
{
	readonly grid: FactorySiteGrid;
	readonly overlay: MapImageOverlay;
	/** Best first, spread apart. */
	readonly spots: FactorySiteSpot[];
}
