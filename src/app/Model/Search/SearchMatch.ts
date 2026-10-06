import {SearchFragment} from '@src/Model/Search/SearchFragment';

export interface SearchMatch
{
	score: number;
	nameFragments: SearchFragment[];
	snippet: SearchFragment[] | null;
}
