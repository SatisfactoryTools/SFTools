import {Component, ChangeDetectionStrategy, ElementRef, Input, computed, effect, signal} from '@angular/core';
import {httpResource} from '@angular/common/http';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {HelpArticleCardComponent} from '@src/Components/Help/HelpArticleCardComponent';
import {HelpArticleHeaderComponent} from '@src/Components/Help/HelpArticleHeaderComponent';
import {HelpContentComponent} from '@src/Components/Help/HelpContentComponent';
import {HelpLinkDirective} from '@src/Components/Help/HelpLinkDirective';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {HelpArticleFile} from '@src/Model/API/Schema/Help/HelpArticleFile';
import {HelpArticleSection} from '@src/Model/API/Schema/Help/HelpArticleSection';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {HelpRelatedArticle} from '@src/Components/Help/HelpRelatedArticle';

/**
 * One article: its body, the contents of the article beside it, and the ways
 * on - "see also" and the neighbours in its category. The body is fetched per
 * article (the manifest carries only metadata) from the static file the
 * backend writes, cache-busted by the manifest's timestamp.
 *
 * The host is its own container, so whether the contents list fits next to
 * the text depends on the width the article itself got - not on the panel's,
 * which may already be spending part of itself on the article list.
 */
@Component({
	selector: 'help-article',
	templateUrl: './HelpArticleComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, HelpArticleCardComponent, HelpArticleHeaderComponent, HelpContentComponent, HelpLinkDirective],
	styles: `
		:host {
			display: block;
			container-type: inline-size;
			container-name: article;
		}
		.article-layout {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 1.75rem;
		}
		/* The reading measure: headings, text and the lists below it all line
		   up on the same column. */
		.article-main {
			max-width: 74ch;
		}
		.section-title {
			margin-bottom: 0.6rem;
			font-size: 0.75rem;
			font-weight: 600;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: #9fb0c0;
		}
		.article-section {
			padding-top: 1.25rem;
			margin-top: 1.75rem;
			border-top: 1px solid #2b3444;
		}
		.related-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
			gap: 0.6rem;
		}

		/* ── Previous / next ────────────────────────────────────────────── */

		/* Two fixed halves, so the one that exists keeps its side of the page
		   instead of stretching across it when there is no other. */
		.steps {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.6rem;
			padding-top: 1.25rem;
			margin-top: 1.75rem;
			border-top: 1px solid #2b3444;
		}
		a.step-next {
			grid-column: 2;
		}
		@container article (max-width: 480px) {
			.steps {
				grid-template-columns: minmax(0, 1fr);
			}
			a.step-next {
				grid-column: 1;
			}
		}
		a.step {
			/* .card lays its content out in a column - these two read as a row. */
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 0.5rem;
			min-width: 0;
			padding: 0.5rem 0.7rem;
			color: var(--bs-body-color);
			text-decoration: none;
		}
		a.step:hover {
			border-color: var(--bs-primary);
		}
		a.step-next {
			justify-content: flex-end;
			text-align: right;
		}
		.step-text {
			flex-grow: 1;
			min-width: 0;
		}
		.step-label {
			display: block;
			font-size: 0.7rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: #7f8fa0;
		}
		.step-title {
			display: block;
			font-size: 0.9rem;
			font-weight: 600;
			line-height: 1.3;
		}
		.step-icon {
			flex-shrink: 0;
			font-size: 0.8em;
			color: #7f8fa0;
		}
		.updated {
			margin-top: 1.25rem;
			margin-bottom: 0;
		}

		/* ── Contents ───────────────────────────────────────────────────── */

		.toc {
			display: none;
		}
		@container article (min-width: 760px) {
			/* Text and contents keep their own widths and share whatever is
			   left over evenly, instead of the contents drifting off to the
			   far edge of a wide screen. */
			.article-layout {
				grid-template-columns: minmax(0, 74ch) 200px;
				justify-content: center;
			}
			.toc {
				display: block;
				position: sticky;
				top: var(--help-sticky-top, 0.75rem);
				align-self: start;
				max-height: calc(100vh - var(--help-sticky-top, 0.75rem) - 2rem);
				overflow-y: auto;
				padding-left: 0.85rem;
				border-left: 1px solid #222b3e;
			}
		}
		.toc-title {
			margin-bottom: 0.4rem;
			font-size: 0.7rem;
			font-weight: 600;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: #7f8fa0;
		}
		.toc-list {
			list-style: none;
			padding: 0;
			margin: 0;
		}
		.toc-list a {
			display: block;
			padding: 0.15rem 0;
			font-size: 0.83rem;
			line-height: 1.3;
			color: #9fb0c0;
			text-decoration: none;
		}
		.toc-list a:hover {
			color: #e9eef5;
		}
		.toc-list a.current {
			color: #fff;
			font-weight: 600;
		}
		.toc-sub a {
			padding-left: 0.7rem;
			font-size: 0.8rem;
		}
	`,
})
export class HelpArticleComponent
{

	public readonly faChevronLeft = faChevronLeft;
	public readonly faChevronRight = faChevronRight;

	private readonly slugSignal = signal('');

	@Input({required: true})
	public set slug(value: string)
	{
		this.slugSignal.set(value);
	}

	protected readonly article = httpResource<HelpArticleFile>(() => this.help.articleUrl(this.slugSignal()));

	protected readonly file = computed<HelpArticleFile | null>(() => this.article.value() ?? null);

	/** The category the article is filed under, shown above its title. */
	protected readonly categoryName = computed(() => {
		const category = this.help.summary(this.slugSignal())?.category ?? '';
		return this.help.categories().find(entry => entry.id === category)?.name ?? '';
	});

	/** The article's own headings - a single one is the title again, so it is not worth a list. */
	protected readonly sections = computed<HelpArticleSection[]>(() => {
		const sections = this.file()?.sections ?? [];
		return sections.length > 1 ? sections : [];
	});

	/** The section being read, to mark it in the contents. */
	protected readonly currentAnchor = computed(() => this.navigation.anchor());

	/** Related articles that actually exist and are published; the rest are skipped. */
	protected readonly relatedArticles = computed<HelpRelatedArticle[]>(() => {
		const related: HelpRelatedArticle[] = [];
		for (const slug of this.file()?.seeAlso ?? []) {
			const summary = this.help.summary(slug);
			if (summary !== null) {
				related.push({slug, title: summary.title, summary: summary.summary});
			}
		}
		return related;
	});

	/** The articles before and after this one in its category - reading it as a chapter. */
	protected readonly previousArticle = computed<HelpRelatedArticle | null>(() => this.neighbour(-1));
	protected readonly nextArticle = computed<HelpRelatedArticle | null>(() => this.neighbour(1));

	protected readonly updated = computed(() => {
		const updatedAt = this.file()?.updatedAt;
		return updatedAt === undefined ? '' : new Date(updatedAt).toLocaleDateString();
	});

	public constructor(
		private readonly help: HelpManager,
		private readonly navigation: HelpNavigation,
		private readonly host: ElementRef<HTMLElement>,
	)
	{
		// Jump to the section a question-mark button or a link pointed at, once
		// the body it lives in is on the page.
		effect(() => {
			const anchor = this.navigation.anchor();
			if (this.file() === null || anchor === '') {
				return;
			}
			// One frame later: the rendered Markdown is written through
			// innerHTML, so the heading only exists after this change detection.
			requestAnimationFrame(() => this.scrollTo(anchor));
		});
	}

	/** A help path to one of this article's own sections, for the contents list. */
	protected sectionPath(anchor: string): string
	{
		return HelpNavigation.pathFor(this.slugSignal(), anchor);
	}

	/** The article `offset` places away in the same category, if there is one. */
	private neighbour(offset: number): HelpRelatedArticle | null
	{
		const slug = this.slugSignal();
		const category = this.help.categories().find(entry => entry.articles.includes(slug));
		if (category === undefined) {
			return null;
		}
		const target = category.articles[category.articles.indexOf(slug) + offset];
		const summary = target === undefined ? null : this.help.summary(target);
		return summary === null ? null : {slug: target, title: summary.title, summary: summary.summary};
	}

	private scrollTo(anchor: string): void
	{
		const heading = this.host.nativeElement.querySelector(`[id="${CSS.escape(anchor)}"]`);
		heading?.scrollIntoView({block: 'start', behavior: 'smooth'});
	}

}
