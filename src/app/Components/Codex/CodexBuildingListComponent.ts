import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {CodexEntityLinkComponent} from '@src/Components/Codex/CodexEntityLinkComponent';
import {CodexItemAmountListComponent} from '@src/Components/Codex/CodexItemAmountListComponent';
import {Building} from '@src/Model/Data/Entities/Building';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';
import {VersionManager} from '@src/Model/Data/VersionManager';

/**
 * Building cross-links as flush list-group rows - drop into a flush
 * codex-section. `showCost` adds each building's full build cost.
 */
@Component({
	selector: 'codex-building-list',
	templateUrl: './CodexBuildingListComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexEntityLinkComponent, CodexItemAmountListComponent],
})
export class CodexBuildingListComponent
{

	@Input({required: true}) public buildings: Building[] = [];
	@Input() public showCost = false;

	public constructor(private readonly versionManager: VersionManager)
	{
	}

	protected buildCostOf(building: Building): ItemAmount[]
	{
		return this.versionManager.activeVersionData()?.searchBuildRecipeForBuilding(building.className)?.ingredients ?? [];
	}

}
