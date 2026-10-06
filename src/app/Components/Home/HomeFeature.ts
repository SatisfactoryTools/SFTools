import {IconDefinition} from '@fortawesome/free-solid-svg-icons';

export interface HomeFeature
{
	readonly icon: IconDefinition;
	readonly title: string;
	readonly text: string;
	readonly link: string[] | null;
}
