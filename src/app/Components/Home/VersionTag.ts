import {VersionTagTone} from '@src/Components/Home/VersionTagTone';

/** One badge on a home page version card: "Official", "recipe ×1.5", "3 mods", … */
export interface VersionTag
{
	readonly label: string;
	readonly tone: VersionTagTone;
}
