import {HelpArticleSection} from '@src/Model/API/Schema/Help/HelpArticleSection';

export interface HelpArticleFile
{

	slug: string;
	title: string;
	summary: string;
	body: string;
	seeAlso: string[];
	sections: HelpArticleSection[];
	updatedAt: string;

}
