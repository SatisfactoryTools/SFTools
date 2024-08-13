import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * The "amount × icon" tile every codex listing uses for an item amount -
 * cross-linked to the item, its name as tooltip, an optional caption (e.g.
 * a per-minute rate) underneath. Renders nothing for dangling references.
 */
@Component({
	selector: 'codex-item-amount-tile',
	templateUrl: './CodexItemAmountTileComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexLinkDirective, GameIconComponent],
	// display:contents lets the anchor participate directly in the parent's
	// flex row; the :not(.btn) qualifiers out-rank the theme's
	// ".table a:not(.btn)" white-underlined-link styling inside tables.
	styles: `
		:host {
			display: contents;
		}
		a.io-tile:not(.btn) {
			display: inline-flex;
			flex-direction: column;
			align-items: center;
			text-decoration: none;
			color: inherit;
		}
		a.io-tile:not(.btn):hover .io-amount {
			text-decoration: underline;
		}
	`,
})
export class CodexItemAmountTileComponent
{

	@Input({required: true}) public entry!: ItemAmount;
	@Input() public caption: string | null = null;

	public constructor(protected readonly formatter: RateFormatter)
	{
	}

}
