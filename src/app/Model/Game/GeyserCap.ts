import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';

export interface GeyserCap
{
	readonly counts: GeothermalGenerators;
	/** The plan's resource area, the whole map, or only the version's totals when its map is not loaded. */
	readonly source: 'area' | 'world' | 'version';
	/** Geysers with a generator on them in the player's game, anywhere on the map. */
	readonly taken: number;
}
