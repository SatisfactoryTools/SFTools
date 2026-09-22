import {Component, ChangeDetectionStrategy, EventEmitter, Input, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleQuestion, faDiagramProject, faFolder} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {SearchFragmentsComponent} from '@src/Components/Common/SearchFragmentsComponent';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchResultGroup} from '@src/Model/Search/SearchResultGroup';

/**
 * The grouped list of search results - the one rendering shared by the navbar
 * dropdown and the fullscreen search on phones. One row always carries the
 * cursor (`active`), which the pointer moves as well as the keyboard.
 */
@Component({
	selector: 'search-result-list',
	templateUrl: './SearchResultListComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, GameIconComponent, SearchFragmentsComponent],
	styles: `
		:host {
			display: block;
		}
		/* The highlight is the keyboard's cursor, shown on hover too so the
		   pointer and the arrow keys agree on where it is. */
		.search-result {
			background: transparent;
			color: var(--bs-body-color);
		}
		.search-result.highlighted {
			background: rgba(255, 255, 255, 0.1);
			box-shadow: inset 2px 0 0 #4c9be8;
		}
	`,
})
export class SearchResultListComponent
{

	public readonly faDiagramProject = faDiagramProject;
	public readonly faFolder = faFolder;
	public readonly faCircleQuestion = faCircleQuestion;

	@Input({required: true}) public groups: SearchResultGroup[] = [];

	/** The row the cursor is on. */
	@Input() public active: SearchResult | null = null;

	/** Bigger rows and icons, for the fullscreen search on a phone. */
	@Input() public large = false;

	@Output() public readonly select = new EventEmitter<SearchResult>();

	@Output() public readonly highlight = new EventEmitter<SearchResult>();

}
