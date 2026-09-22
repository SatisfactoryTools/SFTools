import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowRight} from '@fortawesome/free-solid-svg-icons';
import {HelpLinkDirective} from '@src/Components/Help/HelpLinkDirective';
import {HelpRelatedArticle} from '@src/Components/Help/HelpRelatedArticle';

/**
 * One article as a tile - title, what it is about, and an arrow on hover.
 * Used by the index grid and by an article's "see also" list, so a link to an
 * article looks the same wherever it is offered.
 */
@Component({
	selector: 'help-article-card',
	templateUrl: './HelpArticleCardComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, HelpLinkDirective],
	styles: `
		:host {
			display: block;
		}
		a.card {
			display: flex;
			flex-direction: column;
			gap: 0.2rem;
			height: 100%;
			padding: 0.65rem 0.8rem;
			text-decoration: none;
			color: var(--bs-body-color);
			min-width: 0;
			border-left: 3px solid transparent;
			transition: border-color 0.12s ease, background-color 0.12s ease;
		}
		a.card:hover {
			border-left-color: var(--bs-primary);
			background-color: rgba(255, 255, 255, 0.04);
		}
		.card-title {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: 0.5rem;
			font-weight: 600;
			font-size: 0.95rem;
			line-height: 1.3;
		}
		.card-arrow {
			flex-shrink: 0;
			font-size: 0.75em;
			color: var(--bs-primary);
			opacity: 0;
			transition: opacity 0.12s ease;
		}
		a.card:hover .card-arrow {
			opacity: 1;
		}
		.card-summary {
			font-size: 0.85rem;
			line-height: 1.35;
			color: #9fb0c0;
		}
	`,
})
export class HelpArticleCardComponent
{

	public readonly faArrowRight = faArrowRight;

	@Input({required: true}) public article!: HelpRelatedArticle;

}
