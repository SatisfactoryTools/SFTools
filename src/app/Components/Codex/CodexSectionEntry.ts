import {IconDefinition} from '@fortawesome/free-solid-svg-icons';

/** One tile of the codex section menu. */
export interface CodexSectionEntry
{
	link: string;
	name: string;
	icon: IconDefinition;
	/** "174 items" - the section size, for the tile's caption. */
	count: string;
}
