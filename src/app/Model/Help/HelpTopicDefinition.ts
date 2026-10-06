import {HelpTopicGroup} from '@src/Model/Help/HelpTopicGroup';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';

export interface HelpTopicDefinition
{

	readonly topic: HelpTopicId;

	readonly group: HelpTopicGroup;

	readonly label: string;

	readonly where: string;

}
