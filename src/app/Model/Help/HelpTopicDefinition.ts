import {HelpTopicGroup} from '@src/Model/Help/HelpTopicGroup';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';

/** One help topic: what it is about, and where the reader asks it from. */
export interface HelpTopicDefinition
{

	readonly topic: HelpTopicId;

	readonly group: HelpTopicGroup;

	/** What an article claiming this topic has to answer. */
	readonly label: string;

	/** Where the question mark sits, or how else the topic is reached. */
	readonly where: string;

}
