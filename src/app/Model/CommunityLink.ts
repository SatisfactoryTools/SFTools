import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {CommunityLinkKind} from '@src/Model/CommunityLinkKind';

/** One external link of the project: Discord, GitHub, or a way to donate. */
export interface CommunityLink
{
	readonly key: string;
	readonly label: string;
	readonly url: string;
	readonly icon: IconDefinition;
	/** Brand tint for the icon on dark backgrounds. */
	readonly color: string;
	readonly kind: CommunityLinkKind;
}
