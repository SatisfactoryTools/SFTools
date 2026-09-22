/** The fields a save sends; anything left out keeps its stored value. */
export interface HelpEditorArticleInput
{

	slug?: string;
	title?: string;
	summary?: string;
	body?: string;
	keywords?: string[];
	topics?: Record<string, string>;
	seeAlso?: string[];
	category?: string | null;
	position?: number;
	published?: boolean;

}
