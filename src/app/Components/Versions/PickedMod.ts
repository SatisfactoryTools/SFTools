import {Mod} from '@src/Model/API/Schema/Mods/Mod';

/** A mod chosen for a new custom version, with the mod version to merge. */
export interface PickedMod
{
	readonly mod: Mod;
	versionId: string;
}
