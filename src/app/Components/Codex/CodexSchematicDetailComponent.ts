import {Component, ChangeDetectionStrategy, Input, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {CodexBuildingListComponent} from '@src/Components/Codex/CodexBuildingListComponent';
import {CodexEntityLinkComponent} from '@src/Components/Codex/CodexEntityLinkComponent';
import {CodexItemAmountListComponent} from '@src/Components/Codex/CodexItemAmountListComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {CodexRecipeListComponent} from '@src/Components/Codex/CodexRecipeListComponent';
import {CodexSchematicListComponent} from '@src/Components/Codex/CodexSchematicListComponent';
import {CodexSectionComponent} from '@src/Components/Codex/CodexSectionComponent';
import {SchematicType} from '@src/Model/API/Schema/Data/Parts/SchematicType';
import {Building} from '@src/Model/Data/Entities/Building';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {Schematic} from '@src/Model/Data/Entities/Schematic';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {RateFormatter} from '@src/Model/RateFormatter';

@Component({
	selector: 'codex-schematic-detail',
	templateUrl: './CodexSchematicDetailComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		CodexLinkDirective,
		CodexBuildingListComponent,
		CodexEntityLinkComponent,
		CodexItemAmountListComponent,
		CodexRecipeListComponent,
		CodexSchematicListComponent,
		CodexSectionComponent,
		FaIconComponent,
		GameIconComponent,
	],
})
export class CodexSchematicDetailComponent
{

	public readonly faChevronLeft = faChevronLeft;

	private readonly schematicClassNameSignal = signal<string | null>(null);

	@Input({required: true})
	public set schematicClassName(value: string)
	{
		this.schematicClassNameSignal.set(value);
	}

	protected readonly schematic = computed<Schematic | null>(() => {
		const className = this.schematicClassNameSignal();
		if (className === null) {
			return null;
		}
		return this.versionManager.activeVersionData()?.searchSchematicByClassName(className) ?? null;
	});

	/** Production recipes this schematic unlocks (build-gun recipes appear as buildings instead). */
	protected readonly unlockedRecipes = computed<Recipe[]>(() =>
		this.unlockRecipes().filter(recipe => !recipe.inBuildGun),
	);

	protected readonly unlockedBuildings = computed<Building[]>(() => {
		const data = this.versionManager.activeVersionData();
		if (!data) {
			return [];
		}
		return this.unlockRecipes()
			.map(recipe => data.searchBuildingForBuildRecipe(recipe.className))
			.filter((building): building is Building => building !== undefined);
	});

	protected readonly unlockedSchematics = computed<Schematic[]>(() =>
		(this.schematic()?.unlock.schematics ?? []).filter(schematic => !!schematic),
	);

	protected readonly requiredSchematics = computed<Schematic[]>(() =>
		(this.schematic()?.dependency.schematics ?? []).filter(schematic => !!schematic),
	);

	protected typeLabel(type: SchematicType): string
	{
		switch (type) {
			case SchematicType.Custom: return 'Custom';
			case SchematicType.MAM: return 'MAM research';
			case SchematicType.Tutorial: return 'Tutorial';
			case SchematicType.HardDrive: return 'Hard drive';
			case SchematicType.Milestone: return 'Milestone';
			case SchematicType.Alternate: return 'Alternate';
			case SchematicType.AwesomeSink: return 'AWESOME Sink';
			case SchematicType.Customisation: return 'Customisation';
		}
	}

	public constructor(
		private readonly versionManager: VersionManager,
		protected readonly formatter: RateFormatter,
	)
	{
	}

	private unlockRecipes(): Recipe[]
	{
		// Hydration tolerates dangling references (mods) - skip them here.
		return (this.schematic()?.unlock.recipes ?? []).filter(recipe => !!recipe);
	}

}
