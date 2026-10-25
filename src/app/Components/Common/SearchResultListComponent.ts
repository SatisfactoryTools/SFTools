import {Component, ChangeDetectionStrategy, EventEmitter, Input, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleQuestion, faCodeBranch, faDiagramProject, faFolder} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {SearchFragmentsComponent} from '@src/Components/Common/SearchFragmentsComponent';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchResultType} from '@src/Model/Search/SearchResultType';

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
		.search-kind {
			font-size: 0.7rem;
			letter-spacing: 0.03em;
		}
		.search-result.highlighted {
			background: rgba(255, 255, 255, 0.1);
			box-shadow: inset 2px 0 0 var(--bs-primary);
		}
	`,
})
export class SearchResultListComponent
{

	public readonly faDiagramProject = faDiagramProject;
	public readonly faFolder = faFolder;
	public readonly faCircleQuestion = faCircleQuestion;
	public readonly faCodeBranch = faCodeBranch;

	public static readonly KIND_LABELS: Record<SearchResultType, string> = {
		plan: 'Plan',
		folder: 'Folder',
		item: 'Item',
		recipe: 'Recipe',
		building: 'Building',
		schematic: 'Schematic',
		version: 'Version',
		article: 'Help',
	};

	@Input({required: true}) public results: SearchResult[] = [];

	@Input() public active: SearchResult | null = null;

	@Input() public large = false;

	@Output() public readonly select = new EventEmitter<SearchResult>();

	@Output() public readonly highlight = new EventEmitter<SearchResult>();

	public kindLabel(result: SearchResult): string
	{
		return result.kindLabel ?? SearchResultListComponent.KIND_LABELS[result.type];
	}

}
