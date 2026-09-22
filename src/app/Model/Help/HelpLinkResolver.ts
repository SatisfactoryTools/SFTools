/**
 * How rendered article content turns app references into links. The help
 * reader lives in two hosts (the planner panel and the fullscreen page) whose
 * URLs differ, so whoever renders an article supplies the resolver.
 */
export interface HelpLinkResolver
{

	/** Link to another article, optionally at a section anchor. */
	articleHref(slug: string, anchor: string): string;

	/** Link to a section of the article being rendered - what a heading's '#' points at. */
	sectionHref(anchor: string): string;

	/**
	 * Link that opens a planner panel, e.g. 'overview'. Empty when this host
	 * has no planner to open it in, which leaves the link as plain text.
	 */
	panelHref(panelId: string): string;

}
