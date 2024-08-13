import {WorldDataPayload} from '@src/Model/API/Schema/World/WorldDataPayload';

/** Body of POST /v1/versions - creates a custom version derived from a public one. */
export interface CreateVersionRequest
{

	/** Id of the public version to derive from. */
	base: string;
	recipeCost?: number;
	powerCost?: number;
	/** Display name; the server derives one from the base and modifiers when omitted. */
	name?: string;
	/** Mod version ids to merge into the data, in order; at most one version per mod. */
	mods?: string[];
	/** World resource-node settings; counts as a real modifier on its own. */
	worldData?: WorldDataPayload;

}
