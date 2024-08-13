import {Component, ChangeDetectionStrategy, Input, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {CodexEntityLinkComponent} from '@src/Components/Codex/CodexEntityLinkComponent';
import {CodexItemAmountListComponent} from '@src/Components/Codex/CodexItemAmountListComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {CodexRecipeListComponent} from '@src/Components/Codex/CodexRecipeListComponent';
import {CodexSchematicListComponent} from '@src/Components/Codex/CodexSchematicListComponent';
import {CodexSectionComponent} from '@src/Components/Codex/CodexSectionComponent';
import {Building} from '@src/Model/Data/Entities/Building';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {Schematic} from '@src/Model/Data/Entities/Schematic';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Formulas} from '@src/Model/Planner/Formulas';
import {RateFormatter} from '@src/Model/RateFormatter';

// Every overclockable machine has three power shard slots - a game rule, not
// carried in the data (see Formulas.CLOCK_PER_SHARD).
const SHARD_SLOTS = 3;

@Component({
	selector: 'codex-building-detail',
	templateUrl: './CodexBuildingDetailComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		CodexLinkDirective,
		CodexEntityLinkComponent,
		CodexItemAmountListComponent,
		CodexRecipeListComponent,
		CodexSchematicListComponent,
		CodexSectionComponent,
		FaIconComponent,
		GameIconComponent,
	],
})
export class CodexBuildingDetailComponent
{

	public readonly faChevronLeft = faChevronLeft;
	public readonly faChevronRight = faChevronRight;

	private readonly buildingClassNameSignal = signal<string | null>(null);

	@Input({required: true})
	public set buildingClassName(value: string)
	{
		this.buildingClassNameSignal.set(value);
	}

	protected readonly building = computed<Building | null>(() => {
		const className = this.buildingClassNameSignal();
		if (className === null) {
			return null;
		}
		return this.versionManager.activeVersionData()?.searchBuildingByClassName(className) ?? null;
	});

	protected readonly buildCost = computed<ItemAmount[]>(() => {
		const className = this.buildingClassNameSignal();
		if (className === null) {
			return [];
		}
		return this.versionManager.activeVersionData()?.searchBuildRecipeForBuilding(className)?.ingredients ?? [];
	});

	protected readonly unlockedBy = computed<Schematic[]>(() => {
		const className = this.buildingClassNameSignal();
		if (className === null) {
			return [];
		}
		return this.versionManager.activeVersionData()?.getSchematicsUnlockingBuilding(className) ?? [];
	});

	protected readonly recipes = computed<Recipe[]>(() => {
		const className = this.buildingClassNameSignal();
		if (className === null) {
			return [];
		}
		return this.versionManager.activeVersionData()?.getRecipesForBuilding(className) ?? [];
	});

	/** Overclock range in percent, including the three power shard slots ("1% – 250%"). */
	protected overclockRange(building: Building): string
	{
		const min = building.minOverclock * 100;
		const max = building.maxOverclock * 100 + SHARD_SLOTS * Formulas.CLOCK_PER_SHARD;
		return `${this.formatter.clock(min)}% – ${this.formatter.clock(max)}%`;
	}

	public constructor(
		private readonly versionManager: VersionManager,
		protected readonly formatter: RateFormatter,
	)
	{
	}

}
