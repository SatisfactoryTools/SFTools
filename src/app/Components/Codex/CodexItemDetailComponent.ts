import {Component, ChangeDetectionStrategy, Input, computed, signal} from '@angular/core';
import {TitleCasePipe} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {CodexBuildingListComponent} from '@src/Components/Codex/CodexBuildingListComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {CodexRecipeListComponent} from '@src/Components/Codex/CodexRecipeListComponent';
import {CodexSchematicListComponent} from '@src/Components/Codex/CodexSchematicListComponent';
import {CodexSectionComponent} from '@src/Components/Codex/CodexSectionComponent';
import {Building} from '@src/Model/Data/Entities/Building';
import {Item} from '@src/Model/Data/Entities/Item';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {Schematic} from '@src/Model/Data/Entities/Schematic';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'codex-item-detail',
	templateUrl: './CodexItemDetailComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		CodexLinkDirective,
		CodexBuildingListComponent,
		CodexRecipeListComponent,
		CodexSchematicListComponent,
		CodexSectionComponent,
		FaIconComponent,
		TitleCasePipe,
		GameIconComponent,
	],
})
export class CodexItemDetailComponent
{

	public readonly faChevronLeft = faChevronLeft;

	private readonly itemClassNameSignal = signal<string | null>(null);

	@Input({required: true})
	public set itemClassName(value: string)
	{
		this.itemClassNameSignal.set(value);
	}

	protected readonly item = computed<Item | null>(() => {
		const className = this.itemClassNameSignal();
		if (className === null) {
			return null;
		}
		return this.versionManager.activeVersionData()?.searchItemByClassName(className) ?? null;
	});

	protected readonly producedBy = computed<Recipe[]>(() =>
		this.forItem(className => this.versionManager.activeVersionData()?.getRecipesProducingItem(className)),
	);

	protected readonly usedInRecipes = computed<Recipe[]>(() =>
		this.forItem(className => this.versionManager.activeVersionData()?.getRecipesUsingItem(className)),
	);

	protected readonly usedForBuildings = computed<Building[]>(() =>
		this.forItem(className => this.versionManager.activeVersionData()?.getBuildingsCostingItem(className)),
	);

	protected readonly usedForSchematics = computed<Schematic[]>(() =>
		this.forItem(className => this.versionManager.activeVersionData()?.getSchematicsCostingItem(className)),
	);

	public constructor(private readonly versionManager: VersionManager)
	{
	}

	private forItem<T>(lookup: (className: string) => T[] | undefined): T[]
	{
		const className = this.itemClassNameSignal();
		return className !== null ? (lookup(className) ?? []) : [];
	}

}
