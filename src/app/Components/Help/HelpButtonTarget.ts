/** The article a question-mark button leads to, once its topic is resolved. */
export interface HelpButtonTarget
{

	/** Help path: 'slug', or 'slug#section' when the topic points at a section. */
	path: string;
	title: string;

}
