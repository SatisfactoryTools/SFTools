import {Mod} from '@src/Model/API/Schema/Mods/Mod';

export interface PickedMod
{
	readonly mod: Mod;
	versionId: string;
}
