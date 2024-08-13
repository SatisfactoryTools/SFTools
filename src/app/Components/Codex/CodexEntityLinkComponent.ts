import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';

/**
 * Inline icon+name reference to any codex entity, linked to its detail -
 * THE way to display an entity anywhere in the codex, so every mention is
 * a cross-link. Multi-icon supports recipes (their products).
 */
@Component({
	selector: 'codex-entity-link',
	templateUrl: './CodexEntityLinkComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexLinkDirective, GameIconComponent],
	// The :not(.btn) qualifiers out-rank the theme's ".table a:not(.btn)"
	// underlined-link styling when the link sits inside a table.
	styles: `
		a.entity-link:not(.btn) {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			text-decoration: none;
			min-width: 0;
		}
		a.entity-link:not(.btn):hover .entity-name {
			text-decoration: underline;
		}
		.entity-name {
			overflow-wrap: break-word;
		}
	`,
})
export class CodexEntityLinkComponent
{

	@Input({required: true}) public link = '';
	@Input({required: true}) public name = '';
	@Input() public icons: (string | null)[] = [];
	@Input() public size = 20;

}
