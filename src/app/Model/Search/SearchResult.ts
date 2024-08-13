import {SearchFragment} from '@src/Model/Search/SearchFragment';
import {SearchResultType} from '@src/Model/Search/SearchResultType';

export interface SearchResult
{
	type: SearchResultType;
	/** className for codex entities, plan/folder id otherwise. */
	id: string;
	name: string;
	/** Game icon hashes (a recipe's products); empty for plans and folders. */
	icons: (string | null)[];
	score: number;
	/** The name split for display, matched parts marked for bolding. */
	nameFragments: SearchFragment[];
	/** Why a description match appeared: context around the hit. Null for name matches. */
	snippet: SearchFragment[] | null;
}
