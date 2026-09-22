import {Component, ChangeDetectionStrategy, ElementRef, ViewChild} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
import {FitViewportDirective} from '@src/Components/Common/FitViewportDirective';
import {SearchResultListComponent} from '@src/Components/Common/SearchResultListComponent';
import {SearchBoxState} from '@src/Model/Search/SearchBoxState';
import {SearchResult} from '@src/Model/Search/SearchResult';

/**
 * The navbar's search box: everything the app knows about is in it - the
 * codex, the user's plans and folders, and the help articles. The arrow keys
 * walk the results and Enter opens the one under the cursor, the same way the
 * searchable pickers work.
 */
@Component({
	selector: 'navbar-search',
	templateUrl: './NavbarSearchComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, SearchResultListComponent, FitViewportDirective],
	providers: [SearchBoxState],
	styles: `
		/* Fills the room the navbar gives it (see NavbarComponent's styles). */
		:host { display: block; }
		.search-icon {
			position: absolute;
			left: 0.7rem;
			top: 50%;
			transform: translateY(-50%);
			pointer-events: none;
			color: #9fb0c0;
		}
		input {
			padding-left: 2.1rem;
		}
	`,
})
export class NavbarSearchComponent
{

	public readonly faMagnifyingGlass = faMagnifyingGlass;

	public showResults = false;

	@ViewChild('searchInput') private searchInput: ElementRef<HTMLInputElement> | undefined;

	public constructor(
		public readonly state: SearchBoxState,
		private readonly elementRef: ElementRef<HTMLElement>,
	)
	{
	}

	/** Puts the caret into the search box (the app's search shortcut). */
	public focus(): void
	{
		this.searchInput?.nativeElement.focus();
		this.searchInput?.nativeElement.select();
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

	protected onInput(event: Event): void
	{
		this.state.setQuery((event.target as HTMLInputElement).value);
		this.showResults = true;
	}

	protected onKeydown(event: KeyboardEvent): void
	{
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				this.state.moveActive(1);
				this.scrollActiveIntoView();
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.state.moveActive(-1);
				this.scrollActiveIntoView();
				break;
			case 'Enter':
				event.preventDefault();
				if (this.state.openActive()) {
					this.showResults = false;
					this.searchInput?.nativeElement.blur();
				}
				break;
			case 'Escape':
				this.showResults = false;
				break;
		}
	}

	protected open(result: SearchResult): void
	{
		this.showResults = false;
		this.state.open(result);
	}

	/** Keeps the highlighted result inside the scrolling list as the arrows walk past its edge. */
	private scrollActiveIntoView(): void
	{
		setTimeout(() => this.elementRef.nativeElement
			.querySelectorAll('.search-result')[this.state.activeIndex()]
			?.scrollIntoView({block: 'nearest'}));
	}

}
