import {Component, ChangeDetectionStrategy, EventEmitter, Input, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faChevronRight} from '@fortawesome/free-solid-svg-icons';

/**
 * Card with a click-to-collapse header, the shared look for every titled
 * section in the planner panels. The header takes optional extra controls
 * projected as `[card-actions]` (clicks there do not toggle); the body is
 * whatever the caller projects, so the caller decides when to render it -
 * typically `@if (open) { <div class="card-body">…</div> }`.
 */
@Component({
	selector: 'collapsible-card',
	templateUrl: './CollapsibleCardComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
	styles: [`
		:host {
			display: block;
		}
		.card-header {
			cursor: pointer;
			user-select: none;
		}
	`],
})
export class CollapsibleCardComponent
{

	public readonly faChevronDown = faChevronDown;
	public readonly faChevronRight = faChevronRight;

	@Input({required: true}) public title = '';
	@Input() public open = true;

	@Output() public readonly toggle = new EventEmitter<void>();

}
