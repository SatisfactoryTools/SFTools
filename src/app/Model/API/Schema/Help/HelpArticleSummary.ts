import {HelpArticleSection} from '@src/Model/API/Schema/Help/HelpArticleSection';

export interface HelpArticleSummary
{

	title: string;
	summary: string;
	keywords: string[];
	topics: Record<string, string>;
	sections: HelpArticleSection[];
	seeAlso: string[];
	category: string;
	updatedAt: string;

}
