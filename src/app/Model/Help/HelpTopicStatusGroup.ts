import {HelpTopicStatus} from '@src/Model/Help/HelpTopicStatus';

export interface HelpTopicStatusGroup
{

	readonly label: string;

	readonly description: string;

	readonly topics: HelpTopicStatus[];

}
