import {SearchFragment} from '@src/Model/Search/SearchFragment';
import {SearchResultType} from '@src/Model/Search/SearchResultType';

export interface SearchResult
{
	type: SearchResultType;
	/** className for codex entities, version/plan/folder id, or a help path ('slug' / 'slug#section'). */
	id: string;
	name: string;
	icons: (string | null)[];
	score: number;
	nameFragments: SearchFragment[];
	snippet: SearchFragment[] | null;
	/** Replaces the kind's own label, e.g. a subplan among plans. */
	kindLabel?: string;
}
