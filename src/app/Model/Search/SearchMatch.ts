import {SearchFragment} from '@src/Model/Search/SearchFragment';

/** How a candidate matched: its score plus the highlighted display parts. */
export interface SearchMatch
{
	score: number;
	nameFragments: SearchFragment[];
	/** Context around a description hit; null when the name matched. */
	snippet: SearchFragment[] | null;
}
