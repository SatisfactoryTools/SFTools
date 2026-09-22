/** The article that answers a help topic. */
export interface HelpTopicClaim
{

	readonly id: string;

	readonly title: string;

	readonly published: boolean;

	/** Section the topic points at; empty for the top of the article. */
	readonly anchor: string;

}
