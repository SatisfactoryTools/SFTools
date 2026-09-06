import {IconDefinition} from '@fortawesome/free-solid-svg-icons';

/** One of the "what's inside" tiles on the home page. */
export interface HomeFeature
{
	readonly icon: IconDefinition;
	readonly title: string;
	readonly text: string;
	/** Router commands the tile leads to; null renders it as plain text. */
	readonly link: string[] | null;
}
