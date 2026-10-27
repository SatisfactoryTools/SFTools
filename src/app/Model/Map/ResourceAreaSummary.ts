import {PurityCounts} from '@src/Model/API/Schema/World/PurityCounts';
import {ResourceAreaRow} from '@src/Model/Map/ResourceAreaRow';

export interface ResourceAreaSummary
{
	/** Resources with something inside the area, and the unlimited ones. */
	readonly rows: ResourceAreaRow[];
	/** Every resource the world has nodes of; null means unlimited. */
	readonly limits: ReadonlyMap<string, number | null>;
	readonly nodeCount: number;
	/** Inside, but with an extractor on them: not counted. */
	readonly takenCount: number;
	/** Free geysers inside: they cap the plan's geothermal generators. */
	readonly geysers: PurityCounts;
}
