/** Where a question-mark button leads: an article, optionally at a section. */
export interface HelpTopic
{

	slug: string;
	/** Section anchor without the '#'; empty for the top of the article. */
	anchor: string;

}
