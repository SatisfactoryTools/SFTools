/** One row of the topic editor: the topic id and the section it points at. */
export interface HelpTopicEntry
{

	topic: string;
	/** Section anchor without the '#'; empty means the top of the article. */
	anchor: string;

}
