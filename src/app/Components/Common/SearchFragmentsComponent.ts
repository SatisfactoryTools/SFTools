import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {SearchFragment} from '@src/Model/Search/SearchFragment';

/**
 * Search result text with its matched parts in bold - the one rendering of
 * SearchFragment[] (navbar search, codex search).
 */
@Component({
	selector: 'search-fragments',
	templateUrl: './SearchFragmentsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: `
		:host {
			display: inline;
		}
	`,
})
export class SearchFragmentsComponent
{

	@Input({required: true}) public fragments: SearchFragment[] = [];

}
