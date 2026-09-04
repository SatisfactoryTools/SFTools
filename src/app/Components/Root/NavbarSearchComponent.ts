import {Component, ChangeDetectionStrategy, computed, signal, ElementRef, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faDiagramProject, faFolder} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {SearchFragmentsComponent} from '@src/Components/Common/SearchFragmentsComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchResultType} from '@src/Model/Search/SearchResultType';
import {SearchService} from '@src/Model/Search/SearchService';

@Component({
	selector: 'navbar-search',
	templateUrl: './NavbarSearchComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, GameIconComponent, SearchFragmentsComponent],
	styles: `
		/* Fills the room the navbar gives it: the 360px flex slot on desktop, the full menu width on phones. */
		:host { display: block; }
		.search-result {
			background: transparent;
			color: var(--bs-body-color);
		}
		.search-result:hover,
		.search-result.active {
			background: rgba(255, 255, 255, 0.1);
		}
	`,
})
export class NavbarSearchComponent
{

	public readonly faDiagramProject = faDiagramProject;
	public readonly faFolder = faFolder;

	private readonly querySignal = signal('');
	private readonly activeIndexSignal = signal(0);
	public readonly activeIndex = this.activeIndexSignal.asReadonly();

	public showResults = false;

	@ViewChild('searchInput') private searchInput: ElementRef<HTMLInputElement> | undefined;

	public readonly groups = computed(() => this.searchService.search(this.querySignal()));
	public readonly flatResults = computed(() => this.groups().flatMap(group => group.results));

	public get query(): string
	{
		return this.querySignal();
	}

	public set query(value: string)
	{
		this.querySignal.set(value);
		this.activeIndexSignal.set(0);
	}

	public constructor(
		private readonly searchService: SearchService,
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
		private readonly router: Router,
	)
	{
	}

	/** Puts the caret into the search box (the navbar's search shortcut on phones). */
	public focus(): void
	{
		this.searchInput?.nativeElement.focus();
	}

	protected onFocus(): void
	{
		this.showResults = true;
	}

	protected onBlur(): void
	{
		// Delayed so a click on a result still lands before the list hides.
		setTimeout(() => { this.showResults = false; }, 200);
	}

	protected onKeydown(event: KeyboardEvent): void
	{
		const results = this.flatResults();
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				this.activeIndexSignal.update(index => Math.min(index + 1, results.length - 1));
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.activeIndexSignal.update(index => Math.max(index - 1, 0));
				break;
			case 'Enter':
				event.preventDefault();
				if (results[this.activeIndexSignal()]) {
					this.open(results[this.activeIndexSignal()]);
				}
				break;
			case 'Escape':
				this.showResults = false;
				break;
		}
	}

	public open(result: SearchResult): void
	{
		const version = this.versionManager.activeVersion();
		if (version === null) {
			return;
		}
		const slug = this.versionManager.urlSlug(version);
		this.query = '';
		this.showResults = false;

		switch (result.type) {
			case 'plan':
				void this.router.navigate(['/', slug, 'planner', result.id]);
				return;
			case 'folder':
				// Folder selection has no URL state (yet) - navigate to the
				// planner, then select the folder in the store.
				void this.router.navigate(['/', slug, 'planner'])
					.then(() => this.planManager.setActiveFolder(result.id));
				return;
			default:
				void this.router.navigate(['/', slug, 'codex', this.codexSection(result.type), result.id]);
		}
	}

	private codexSection(type: SearchResultType): string
	{
		switch (type) {
			case 'item': return 'items';
			case 'recipe': return 'recipes';
			case 'building': return 'buildings';
			default: return 'schematics';
		}
	}

}
