/** The help reader lives in two hosts (planner panel, fullscreen page) whose URLs differ, so whoever renders an article supplies the resolver. */
export interface HelpLinkResolver
{

	articleHref(slug: string, anchor: string): string;

	sectionHref(anchor: string): string;

	panelHref(panelId: string): string;

}
