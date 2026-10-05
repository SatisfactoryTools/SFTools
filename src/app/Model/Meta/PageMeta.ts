/** What a page shows in the tab title and its link preview tags. */
export interface PageMeta
{

	/** Without the " – Satisfactory Tools" suffix; PageMetaService adds it. */
	title: string;
	/** Raw text, normalized on the way in; the site default when left out. */
	description?: string | null;
	/** Absolute URL; the logo when left out. */
	image?: string | null;

}
