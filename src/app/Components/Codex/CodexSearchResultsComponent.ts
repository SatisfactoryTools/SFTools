import {Component, ChangeDetectionStrategy} from '@angular/core';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {SearchFragmentsComponent} from '@src/Components/Common/SearchFragmentsComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {CodexSearchState} from '@src/Components/Codex/CodexSearchState';

/**
 * The codex panel's search results, grouped by section, shown in place of
 * the browsed content while a query is typed. Rows are real codex links in
 * the same row style as the narrow entry list; the keyboard cursor from the
 * search box highlights one of them.
 */
@Component({
	selector: 'codex-search-results',
	templateUrl: './CodexSearchResultsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexLinkDirective, GameIconComponent, SearchFragmentsComponent],
	styles: `
		:host {
			display: block;
		}
		a.result {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 0.5rem;
			padding: 0.25rem 0.5rem;
			text-decoration: none;
			color: var(--bs-body-color);
			min-width: 0;
		}
		a.result:hover,
		a.result.active {
			border-color: var(--bs-primary);
		}
		.result-icons {
			display: flex;
			align-items: center;
			gap: 2px;
			flex: none;
		}
		.result-text {
			display: flex;
			flex-direction: column;
			min-width: 0;
			line-height: 1.25;
		}
		.result-name {
			font-size: 0.85em;
		}
	`,
})
export class CodexSearchResultsComponent
{

	public constructor(public readonly state: CodexSearchState)
	{
	}

}
