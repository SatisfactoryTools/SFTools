import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {CodexEntityLinkComponent} from '@src/Components/Codex/CodexEntityLinkComponent';
import {CodexItemAmountListComponent} from '@src/Components/Codex/CodexItemAmountListComponent';
import {Schematic} from '@src/Model/Data/Entities/Schematic';

/**
 * Schematic cross-links as flush list-group rows - drop into a flush
 * codex-section. `showCost` adds each schematic's full research cost.
 */
@Component({
	selector: 'codex-schematic-list',
	templateUrl: './CodexSchematicListComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexEntityLinkComponent, CodexItemAmountListComponent],
})
export class CodexSchematicListComponent
{

	@Input({required: true}) public schematics: Schematic[] = [];
	@Input() public showCost = false;

}
