import {WorldDataPayload} from '@src/Model/API/Schema/World/WorldDataPayload';

export interface Version
{

	id: string;
	name: string;
	/** May be null for (old) custom versions - they are addressed by their id instead. */
	slug: string | null;
	experimental: boolean;
	custom: boolean;
	official: boolean;
	/** Custom versions inherit this from their base version. */
	ficsmas: boolean;
	/**
	 * The version's data file under the API host. A cache artifact: the file
	 * may be pruned and the path changes when generation inputs change - never
	 * persist it, always use the most recently returned one (the version id
	 * is the durable handle).
	 */
	dataPath: string;
	/** The public version a custom version was derived from; null for public versions. */
	baseVersion: string | null;
	/** Recipe-cost (ingredient amount) multiplier baked into the data file; 1 for public versions. */
	recipeCost: number;
	/** Power-consumption multiplier baked into the data file; 1 for public versions. */
	powerCost: number;
	/** Mod version ids merged into this version's data, in application order; empty for public versions. */
	mods: string[];
	/** World resource-node settings baked into the data; null when none were set. */
	worldData: WorldDataPayload | null;

}
