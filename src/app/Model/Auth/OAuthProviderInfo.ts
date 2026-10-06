import {IconDefinition} from '@fortawesome/free-brands-svg-icons';

export interface OAuthProviderInfo
{
	readonly key: string;
	readonly label: string;
	readonly icon: IconDefinition;
	readonly color: string;
}
