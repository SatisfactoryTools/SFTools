import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';

@Component({
	selector: 'codex-detail-header',
	templateUrl: './CodexDetailHeaderComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexLinkDirective, FaIconComponent, GameIconComponent],
	styles: `
		:host {
			display: block;
		}
		.hero-icons {
			display: flex;
			gap: 0.25rem;
			flex: none;
		}
		.hero-icon ::ng-deep img {
			width: 96px;
			height: 96px;
		}
		@container panel (max-width: 480px) {
			.hero-icon ::ng-deep img {
				width: 64px;
				height: 64px;
			}
		}
	`,
})
export class CodexDetailHeaderComponent
{

	public readonly faChevronLeft = faChevronLeft;

	@Input({required: true}) public backLink = '';
	@Input({required: true}) public backLabel = '';
	@Input() public icons: (string | null)[] = [];
	@Input() public name: string | null = null;

}
