import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {CommunityLinkKind} from '@src/Model/CommunityLinkKind';

export interface CommunityLink
{
	readonly key: string;
	readonly label: string;
	readonly url: string;
	readonly icon: IconDefinition;
	readonly color: string;
	readonly kind: CommunityLinkKind;
}
