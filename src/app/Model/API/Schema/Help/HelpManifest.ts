import {HelpArticleSummary} from '@src/Model/API/Schema/Help/HelpArticleSummary';
import {HelpManifestCategory} from '@src/Model/API/Schema/Help/HelpManifestCategory';

/**
 * The help index: every published article's metadata plus the section
 * structure. Small enough to load once at startup, which is what lets the
 * search, the question-mark buttons and the browser menu work synchronously.
 */
export interface HelpManifest
{

	/** When the snapshot was written; used to cache-bust article files. */
	generatedAt: string;
	categories: HelpManifestCategory[];
	articles: Record<string, HelpArticleSummary>;

}
