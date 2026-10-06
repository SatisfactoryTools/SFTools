import {HelpTopicClaim} from '@src/Model/Help/HelpTopicClaim';

export interface HelpTopicStatus
{

	readonly topic: string;

	readonly label: string;

	readonly where: string;

	readonly known: boolean;

	readonly claim: HelpTopicClaim | null;

}
