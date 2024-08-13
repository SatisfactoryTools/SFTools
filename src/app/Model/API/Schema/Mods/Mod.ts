import {ModVersion} from '@src/Model/API/Schema/Mods/ModVersion';

/** A user-managed set of data changes, mergeable into custom versions. */
export interface Mod
{

	id: string;
	name: string;
	/** Public mods are visible and usable by everyone; private ones only by their author. */
	public: boolean;
	/** Whether the requesting user owns (and may manage) this mod. */
	owned: boolean;
	createdAt: string;
	versions: ModVersion[];

}
