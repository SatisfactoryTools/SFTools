import {HelpArticleSection} from '@src/Model/API/Schema/Help/HelpArticleSection';

/** Everything about an article except its body, as carried by the manifest. */
export interface HelpArticleSummary
{

	title: string;
	summary: string;
	/** Extra search terms that do not appear in the title or summary. */
	keywords: string[];
	/** Topic id (what a question-mark button names) to section anchor; '' means the top. */
	topics: Record<string, string>;
	sections: HelpArticleSection[];
	/** Slugs of related articles; ones missing from the manifest are skipped. */
	seeAlso: string[];
	/** Category id, '' for the uncategorised group. */
	category: string;
	updatedAt: string;

}
