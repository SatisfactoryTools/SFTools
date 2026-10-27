import {FactorySiteGrid} from '@src/Model/Map/FactorySite/FactorySiteGrid';
import {FactorySiteMode} from '@src/Model/Map/FactorySite/FactorySiteMode';
import {FactorySiteResource} from '@src/Model/Map/FactorySite/FactorySiteResource';

export interface FactorySiteWorkerRequest
{
	readonly id: number;
	readonly grid: FactorySiteGrid;
	/** 1 where a factory can stand; null scores every cell. */
	readonly mask: Uint8Array | null;
	readonly resources: FactorySiteResource[];
	readonly mode: FactorySiteMode;
}
