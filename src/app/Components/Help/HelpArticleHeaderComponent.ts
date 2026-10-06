import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

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

	@Input() public category = '';

	@Input({required: true}) public title = '';

	@Input() public summary = '';

}
