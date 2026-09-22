import {HelpTopicStatus} from '@src/Model/Help/HelpTopicStatus';

/** Topics of one part of the app, as the editor lists them. */
export interface HelpTopicStatusGroup
{

	readonly label: string;

	readonly description: string;

	readonly topics: HelpTopicStatus[];

}
