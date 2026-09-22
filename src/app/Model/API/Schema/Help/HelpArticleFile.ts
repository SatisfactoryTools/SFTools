import {HelpArticleSection} from '@src/Model/API/Schema/Help/HelpArticleSection';

/** One article as served to readers - the manifest entry plus the Markdown body. */
export interface HelpArticleFile
{

	slug: string;
	title: string;
	summary: string;
	/** Markdown source, rendered by HelpMarkdownRenderer. */
	body: string;
	seeAlso: string[];
	sections: HelpArticleSection[];
	updatedAt: string;

}
