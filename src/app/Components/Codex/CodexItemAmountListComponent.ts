import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {CodexItemAmountTileComponent} from '@src/Components/Codex/CodexItemAmountTileComponent';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';

@Component({
	selector: 'codex-item-amount-list',
	templateUrl: './CodexItemAmountListComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexItemAmountTileComponent],
})
export class CodexItemAmountListComponent
{

	@Input({required: true}) public amounts: ItemAmount[] = [];

}
