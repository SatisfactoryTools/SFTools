import {HelpRelatedArticle} from '@src/Components/Help/HelpRelatedArticle';

/** A category of the help index with the articles listed under it. */
export interface HelpArticleGroup
{

	id: string;
	name: string;
	articles: HelpRelatedArticle[];

}
