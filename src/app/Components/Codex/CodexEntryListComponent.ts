import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {CodexEntry} from '@src/Components/Codex/CodexEntry';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';

/**
 * The one list page layout for all codex sections: heading with a back link
 * to the section menu, then the entries. Adapts to its *container* (the
 * codex lives in a resizable panel, so the viewport is meaningless): a card
 * grid when wide, compact icon rows - in the same card colours - when narrow.
 */
@Component({
	selector: 'codex-entry-list',
	templateUrl: './CodexEntryListComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexLinkDirective, FaIconComponent, GameIconComponent],
	styles: `
		:host {
			display: block;
			container-type: inline-size;
		}
		.entry-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
			gap: 0.5rem;
		}
		a.entry {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.25rem;
			padding: 0.5rem 0.25rem;
			text-align: center;
			text-decoration: none;
			color: var(--bs-body-color);
			min-width: 0;
		}
		a.entry:hover {
			border-color: var(--bs-primary);
		}
		.entry-icons {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 2px;
			flex: none;
		}
		.entry-name {
			font-size: 0.85em;
			line-height: 1.2;
			overflow-wrap: anywhere;
		}

		@container (max-width: 480px) {
			.entry-grid {
				grid-template-columns: 1fr;
				gap: 0.25rem;
			}
			a.entry {
				flex-direction: row;
				align-items: center;
				text-align: start;
				gap: 0.5rem;
				padding: 0.25rem 0.5rem;
			}
			a.entry ::ng-deep img {
				width: 24px;
				height: 24px;
			}
		}
	`,
})
export class CodexEntryListComponent
{

	public readonly faChevronLeft = faChevronLeft;

	@Input({required: true}) public heading = '';
	@Input({required: true}) public entries: CodexEntry[] = [];

}
