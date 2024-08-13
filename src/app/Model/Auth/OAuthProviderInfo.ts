import {IconDefinition} from '@fortawesome/free-brands-svg-icons';

/** Display metadata of one third-party sign-in provider. */
export interface OAuthProviderInfo
{
	readonly key: string;
	readonly label: string;
	readonly icon: IconDefinition;
}
