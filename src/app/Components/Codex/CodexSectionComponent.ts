import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

/**
 * Bootstrap card every codex detail section uses: compact heading (the same
 * as the planner's collapsible cards) + content body. `flush` removes the
 * body padding so list-groups and tables sit edge to edge.
 */
@Component({
	selector: 'codex-section',
	templateUrl: './CodexSectionComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: `
		:host {
			display: block;
		}
		/* Bootstrap tables default to the root table color, which this theme
		   leaves dark - force the themed body color inside sections. */
		:host ::ng-deep .table {
			--bs-table-color: var(--bs-body-color);
			--bs-table-bg: transparent;
			margin-bottom: 0;
		}
		/* The theme paints list-groups in the lighter secondary tone; inside a
		   section they are rows of the card, divided like table rows. */
		:host ::ng-deep .list-group {
			--bs-list-group-bg: transparent;
			--bs-list-group-color: var(--bs-body-color);
			--bs-list-group-border-color: var(--bs-border-color);
		}
		:host ::ng-deep .list-group-flush > .list-group-item:last-child {
			border-bottom-width: 0;
		}
	`,
})
export class CodexSectionComponent
{

	@Input({required: true}) public heading = '';
	@Input() public flush = false;

}
