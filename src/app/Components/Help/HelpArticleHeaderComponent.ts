import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

/**
 * The top of an article: the section it belongs to, its title and its
 * one-line summary. The editor's preview shows the same thing above the
 * Markdown it renders, so what a writer sees is what a reader gets.
 *
 * The title shrinks in a narrow `article` container (a docked panel), which
 * whoever hosts the article names - the reader does, and so does the preview.
 */
@Component({
	selector: 'help-article-header',
	templateUrl: './HelpArticleHeaderComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: `
		:host {
			display: block;
		}
		.article-head {
			padding-bottom: 0.9rem;
			margin-bottom: 1.25rem;
			border-bottom: 1px solid #2b3444;
		}
		.eyebrow {
			margin-bottom: 0.2rem;
			font-size: 0.7rem;
			font-weight: 600;
			letter-spacing: 0.09em;
			text-transform: uppercase;
			color: var(--bs-primary);
		}
		.article-summary {
			margin-bottom: 0;
			font-size: 1.05rem;
			line-height: 1.5;
			color: #c5d0db;
		}
		/* In a narrow panel the title takes up a whole screenful otherwise. */
		@container article (max-width: 560px) {
			.article-head h1 {
				font-size: 1.35rem;
			}
			.article-summary {
				font-size: 0.95rem;
			}
		}
	`,
})
export class HelpArticleHeaderComponent
{

	/** Name of the section the article sits in; empty hides the line. */
	@Input() public category = '';

	@Input({required: true}) public title = '';

	@Input() public summary = '';

}
