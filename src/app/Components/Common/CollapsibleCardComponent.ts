import {Component, ChangeDetectionStrategy, EventEmitter, Input, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faChevronRight} from '@fortawesome/free-solid-svg-icons';

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

	/** Leave unset when projecting `[card-title]` instead. */
	@Input() public title = '';
	@Input() public open = true;

	@Output() public readonly toggle = new EventEmitter<void>();

}
