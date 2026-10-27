import {FactorySpot} from '@src/Model/Planner/FactorySpot';

/** A plan inside the folder the map shows, with what it marked on the map. */
export interface MapFolderPlan
{
	readonly id: string;
	readonly name: string;
	readonly iconHash: string | null;
	readonly color: string;
	/** World X/Y corners; null when its limits are not from an area, or the area is the folder's own. */
	readonly area: ReadonlyArray<readonly [number, number]> | null;
	readonly spot: FactorySpot | null;
}
