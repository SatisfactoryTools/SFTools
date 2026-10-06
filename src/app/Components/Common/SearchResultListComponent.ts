import {Component, ChangeDetectionStrategy, EventEmitter, Input, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleQuestion, faDiagramProject, faFolder} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {SearchFragmentsComponent} from '@src/Components/Common/SearchFragmentsComponent';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchResultGroup} from '@src/Model/Search/SearchResultGroup';

@Component({
	selector: 'search-result-list',
	templateUrl: './SearchResultListComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, GameIconComponent, SearchFragmentsComponent],
	styles: `
		:host {
			display: block;
		}
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

	@Input() public active: SearchResult | null = null;

	@Input() public large = false;

	@Output() public readonly select = new EventEmitter<SearchResult>();

	@Output() public readonly highlight = new EventEmitter<SearchResult>();

}
