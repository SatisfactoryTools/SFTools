import {HelpTopicClaim} from '@src/Model/Help/HelpTopicClaim';

/** One help topic and the article that answers it, for the editor's list. */
export interface HelpTopicStatus
{

	readonly topic: string;

	readonly label: string;

	readonly where: string;

	/** False for an id an article claims that the app never asks for. */
	readonly known: boolean;

	/** Null while no article claims the topic - its button stays hidden. */
	readonly claim: HelpTopicClaim | null;

}
