import {Component, ChangeDetectionStrategy, Input} from '@angular/core';

/**
 * Bootstrap card every codex detail section uses: heading + content body.
 * `flush` removes the body padding so list-groups and tables sit edge to edge.
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
	`,
})
export class CodexSectionComponent
{

	@Input({required: true}) public heading = '';
	@Input() public flush = false;

}
