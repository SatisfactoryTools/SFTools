import {HelpArticleSummary} from '@src/Model/API/Schema/Help/HelpArticleSummary';
import {HelpManifestCategory} from '@src/Model/API/Schema/Help/HelpManifestCategory';

export interface HelpManifest
{

	generatedAt: string;
	categories: HelpManifestCategory[];
	articles: Record<string, HelpArticleSummary>;

}
