import {Component, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, HostListener, OnDestroy, ViewChild} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMagnifyingGlass, faXmark} from '@fortawesome/free-solid-svg-icons';
import {FitViewportDirective} from '@src/Components/Common/FitViewportDirective';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {SearchResultListComponent} from '@src/Components/Common/SearchResultListComponent';
import {SearchBoxState} from '@src/Model/Search/SearchBoxState';
import {SearchResult} from '@src/Model/Search/SearchResult';

/**
 * Search on a phone: the magnifier in the navbar opens this over the whole
 * screen, with the box on top and the results filling everything below. The
 * navbar's own box is too cramped there - it lived in the folded menu, which
 * had to unfold first and then shared the width with everything else.
 */
@Component({
	selector: 'mobile-search',
	templateUrl: './MobileSearchComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, SearchResultListComponent, FitViewportDirective, HotkeyBlockDirective],
	providers: [SearchBoxState],
	styles: `
		.search-screen {
			position: fixed;
			inset: 0;
			z-index: 1065;
			background: var(--bs-body-bg);
			display: flex;
			flex-direction: column;
		}
		.search-bar {
			background: var(--bs-primary);
			padding: 0.5rem;
		}
		.search-results {
			flex: 1 1 auto;
			overflow-y: auto;
			overscroll-behavior: contain;
			-webkit-overflow-scrolling: touch;
		}
	`,
})
export class MobileSearchComponent implements OnDestroy
{

	public readonly faMagnifyingGlass = faMagnifyingGlass;
	public readonly faXmark = faXmark;

	public visible = false;

	@ViewChild('searchInput') private searchInput: ElementRef<HTMLInputElement> | undefined;

	public constructor(
		public readonly state: SearchBoxState,
		private readonly changeDetector: ChangeDetectorRef,
	)
	{
	}

	public ngOnDestroy(): void
	{
		this.releaseBody();
	}

	public show(): void
	{
		this.state.clear();
		this.visible = true;
		// Rendered right away rather than on the next tick, so the caret goes
		// in while the tap that opened this is still the browser's current
		// gesture - that is what brings the on-screen keyboard up.
		this.changeDetector.detectChanges();
		this.searchInput?.nativeElement.focus();
		document.body.style.overflow = 'hidden';
	}

	public hide(): void
	{
		this.visible = false;
		this.state.clear();
		this.releaseBody();
	}

	@HostListener('document:keydown.escape')
	protected onEscape(): void
	{
		if (this.visible) {
			this.hide();
		}
	}

	protected onInput(event: Event): void
	{
		this.state.setQuery((event.target as HTMLInputElement).value);
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
			case 'Enter': {
				event.preventDefault();
				const result = this.state.activeResult();
				if (result !== null) {
					this.open(result);
				}
				break;
			}
		}
	}

	/** Opens a result and leaves the search behind. */
	protected open(result: SearchResult): void
	{
		this.visible = false;
		this.releaseBody();
		this.state.open(result);
	}

	private scrollActiveIntoView(): void
	{
		setTimeout(() => document
			.querySelectorAll('mobile-search .search-result')[this.state.activeIndex()]
			?.scrollIntoView({block: 'nearest'}));
	}

	private releaseBody(): void
	{
		document.body.style.overflow = '';
	}

}
