import {WorldDataPayload} from '@src/Model/API/Schema/World/WorldDataPayload';

export interface Version
{

	id: string;
	name: string;
	slug: string | null;
	experimental: boolean;
	custom: boolean;
	official: boolean;
	ficsmas: boolean;
	/** Changes when generation inputs change - never persist it, always use the most recently returned one. */
	dataPath: string;
	baseVersion: string | null;
	recipeCost: number;
	powerCost: number;
	mods: string[];
	worldData: WorldDataPayload | null;
	/** Oldest first. Optional because version lists cached before the API sent it lack the field. */
	gameVersions?: string[];

}
