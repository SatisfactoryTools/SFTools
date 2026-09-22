import {Component, ChangeDetectionStrategy, ElementRef, computed, effect, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faChevronLeft, faChevronRight, faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {HelpArticleCardComponent} from '@src/Components/Help/HelpArticleCardComponent';
import {HelpArticleComponent} from '@src/Components/Help/HelpArticleComponent';
import {HelpArticleGroup} from '@src/Components/Help/HelpArticleGroup';
import {HelpLinkDirective} from '@src/Components/Help/HelpLinkDirective';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {HelpManager} from '@src/Model/Help/HelpManager';

/**
 * The help reader itself, driven entirely by the host's HelpNavigation - the
 * same component backs the planner panel and the fullscreen help page. The
 * root path lists every article by category, with a filter box; a slug opens
 * that article.
 *
 * Both views are laid out against the `panel` container rather than the
 * viewport, since the reader is as often a 400px panel as a whole screen:
 * narrow it is one column, and once there is room the article gains a list of
 * every article beside it, the way a manual has its contents in the margin.
 */
@Component({
	selector: 'help-browser',
	templateUrl: './HelpBrowserComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		FormsModule,
		RouterLink,
		FaIconComponent,
		InfoNoteComponent,
		HelpArticleCardComponent,
		HelpArticleComponent,
		HelpLinkDirective,
	],
	styles: `
		:host {
			display: block;
		}
		/* Reading measure plus the margins around it - the reader is centered
		   rather than stretched, however wide the screen is. */
		.help-shell {
			max-width: 1180px;
			margin: 0 auto;
		}
		.help-shell-article {
			max-width: 1200px;
		}

		/* ── Index ──────────────────────────────────────────────────────── */

		.index-head {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 1rem;
			padding-bottom: 0.9rem;
			margin-bottom: 1.1rem;
			border-bottom: 1px solid #2b3444;
		}
		.filter {
			max-width: 360px;
		}
		.filter input {
			padding-left: 2rem;
		}
		.filter-icon {
			position: absolute;
			top: 50%;
			left: 0.65rem;
			transform: translateY(-50%);
			font-size: 0.8rem;
			color: #7f8fa0;
		}
		.category + .category {
			margin-top: 1.6rem;
		}
		.category-title {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			margin-bottom: 0.7rem;
			font-size: 0.75rem;
			font-weight: 600;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: #9fb0c0;
		}
		.category-title::after {
			content: '';
			flex-grow: 1;
			height: 1px;
			background: #2b3444;
		}
		.article-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
			gap: 0.6rem;
		}

		/* ── Article ────────────────────────────────────────────────────── */

		.article-shell {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 1.75rem;
		}
		.article-nav {
			display: none;
		}
		.back {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			margin-bottom: 0.75rem;
		}

		/* Wide enough for a margin: the contents list moves out of the article
		   and the inline back link is no longer needed. */
		@container panel (min-width: 1040px) {
			.article-shell {
				grid-template-columns: 230px minmax(0, 1fr);
			}
			.article-nav {
				display: block;
				position: sticky;
				top: var(--help-sticky-top, 0.75rem);
				align-self: start;
				max-height: calc(100vh - var(--help-sticky-top, 0.75rem) - 2rem);
				overflow-y: auto;
				padding-right: 0.25rem;
				border-right: 1px solid #222b3e;
			}
			.article-shell .back {
				display: none;
			}
		}
		.nav-home {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			margin-bottom: 0.9rem;
			font-size: 0.85rem;
		}
		.nav-group + .nav-group {
			margin-top: 0.25rem;
		}
		/* A whole-width row rather than a label: the categories are folded, and
		   the row is what unfolds them. */
		.nav-group-name {
			display: flex;
			align-items: center;
			gap: 0.4rem;
			width: 100%;
			padding: 0.3rem 0.4rem;
			background: none;
			border: 0;
			font-size: 0.7rem;
			font-weight: 600;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			text-align: left;
			color: #9fb0c0;
		}
		.nav-group-name:hover {
			color: #e9eef5;
			background: rgba(255, 255, 255, 0.04);
		}
		.nav-group-chevron {
			flex-shrink: 0;
			width: 0.7rem;
			font-size: 0.65rem;
			color: #7f8fa0;
		}
		.nav-group-count {
			margin-left: auto;
			font-size: 0.7rem;
			font-weight: 400;
			letter-spacing: 0;
			color: #7f8fa0;
		}
		.nav-group-articles {
			padding: 0.1rem 0 0.35rem;
		}
		a.nav-link {
			display: block;
			padding: 0.18rem 0.5rem;
			font-size: 0.85rem;
			line-height: 1.3;
			color: #9fb0c0;
			text-decoration: none;
			border-left: 2px solid transparent;
		}
		a.nav-link:hover {
			color: #e9eef5;
			background: rgba(255, 255, 255, 0.04);
		}
		a.nav-link.current {
			color: #fff;
			font-weight: 600;
			border-left-color: var(--bs-primary);
			background: rgba(255, 255, 255, 0.05);
		}
	`,
})
export class HelpBrowserComponent
{

	public readonly faChevronDown = faChevronDown;
	public readonly faChevronLeft = faChevronLeft;
	public readonly faChevronRight = faChevronRight;
	public readonly faMagnifyingGlass = faMagnifyingGlass;

	public readonly filter = signal('');

	public readonly slug = computed(() => this.navigation.slug());

	/** Only the accounts allowed to write articles see the way into the editor. */
	public readonly canEdit = computed(() => this.profile.helpEditor());

	/** The index, narrowed to what the filter box matches. */
	public readonly groups = computed<HelpArticleGroup[]>(() => this.buildGroups(this.filter().trim().toLowerCase()));

	/** Every article, for the list beside an open one - the filter is the index's own. */
	public readonly navGroups = computed<HelpArticleGroup[]>(() => this.buildGroups(''));

	/**
	 * Which categories the reader unfolded, and in which article - the list is
	 * far too long to show whole, so it starts folded down to the category the
	 * open article belongs to, and unfolding is forgotten on the way out of it.
	 */
	private readonly unfoldedSignal = signal<{slug: string; ids: ReadonlySet<string>} | null>(null);

	/** The category of the article being read, '' on the index. */
	private readonly currentCategory = computed(() => this.help.summary(this.slug())?.category ?? '');

	public readonly unfoldedCategories = computed<ReadonlySet<string>>(() => {
		const unfolded = this.unfoldedSignal();
		if (unfolded !== null && unfolded.slug === this.slug()) {
			return unfolded.ids;
		}
		const current = this.currentCategory();
		return new Set(current === '' ? [] : [current]);
	});

	public constructor(
		public readonly help: HelpManager,
		private readonly profile: AccountProfileService,
		private readonly navigation: HelpNavigation,
		private readonly host: ElementRef<HTMLElement>,
	)
	{
		// Inside a panel the reader swaps its content within one scroll
		// container, which would otherwise keep its offset - opening an article
		// from far down the list would land mid-page. The fullscreen page
		// scrolls the window, which the router's scroll restoration resets.
		effect(() => {
			this.navigation.slug();
			this.scrollContainerToTop();
			// One frame later: the list only marks the new article as the
			// current one after this change detection.
			requestAnimationFrame(() => this.scrollNavToCurrent());
		});
	}

	public toggleCategory(id: string): void
	{
		const ids = new Set(this.unfoldedCategories());
		if (ids.has(id)) {
			ids.delete(id);
		} else {
			ids.add(id);
		}
		this.unfoldedSignal.set({slug: this.slug(), ids});
	}

	private buildGroups(query: string): HelpArticleGroup[]
	{
		const articles = this.help.articles();
		const groups: HelpArticleGroup[] = [];

		for (const category of this.help.categories()) {
			const entries = category.articles
				.filter(slug => slug in articles && this.matches(slug, query))
				.map(slug => ({slug, title: articles[slug].title, summary: articles[slug].summary}));
			if (entries.length > 0) {
				groups.push({id: category.id, name: category.name, articles: entries});
			}
		}

		return groups;
	}

	/** Title, summary and the article's own keywords - the same fields the navbar search uses. */
	private matches(slug: string, query: string): boolean
	{
		if (query === '') {
			return true;
		}
		const article = this.help.articles()[slug];
		return [article.title, article.summary, ...article.keywords]
			.some(text => text.toLowerCase().includes(query));
	}

	/**
	 * Keeps the open article visible in the list beside it - it is a long list
	 * with its own scrollbar, and an article near the end of it would
	 * otherwise be highlighted somewhere out of sight.
	 */
	private scrollNavToCurrent(): void
	{
		const nav = this.host.nativeElement.querySelector<HTMLElement>('.article-nav');
		const current = nav?.querySelector<HTMLElement>('a.current');
		if (nav === null || nav === undefined || current === null || current === undefined) {
			return;
		}
		// offsetTop is measured against the nav itself, which is positioned
		// (sticky) whenever the list is on screen at all.
		nav.scrollTop = Math.max(0, current.offsetTop - nav.clientHeight / 2);
	}

	private scrollContainerToTop(): void
	{
		for (let element = this.host.nativeElement.parentElement; element !== null; element = element.parentElement) {
			const overflowY = getComputedStyle(element).overflowY;
			if (overflowY === 'auto' || overflowY === 'scroll') {
				element.scrollTop = 0;
				return;
			}
		}
	}

}
