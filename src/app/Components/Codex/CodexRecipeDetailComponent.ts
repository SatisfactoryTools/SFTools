import {Component, ChangeDetectionStrategy, Input, computed, signal} from '@angular/core';
import {PowerDrawComponent} from '@src/Components/Common/PowerDrawComponent';
import {CodexDetailHeaderComponent} from '@src/Components/Codex/CodexDetailHeaderComponent';
import {CodexRecipeListComponent} from '@src/Components/Codex/CodexRecipeListComponent';
import {CodexSchematicListComponent} from '@src/Components/Codex/CodexSchematicListComponent';
import {CodexSectionComponent} from '@src/Components/Codex/CodexSectionComponent';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {Schematic} from '@src/Model/Data/Entities/Schematic';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Formulas} from '@src/Model/Planner/Formulas';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';

@Component({
	selector: 'codex-recipe-detail',
	templateUrl: './CodexRecipeDetailComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		CodexDetailHeaderComponent,
		CodexRecipeListComponent,
		CodexSchematicListComponent,
		CodexSectionComponent,
		PowerDrawComponent,
	],
})
export class CodexRecipeDetailComponent
{

	private readonly recipeClassNameSignal = signal<string | null>(null);

	@Input({required: true})
	public set recipeClassName(value: string)
	{
		this.recipeClassNameSignal.set(value);
	}

	protected readonly recipe = computed<Recipe | null>(() => {
		const className = this.recipeClassNameSignal();
		if (className === null) {
			return null;
		}
		return this.versionManager.activeVersionData()?.searchRecipeByClassName(className) ?? null;
	});

	protected readonly unlockedBy = computed<Schematic[]>(() => {
		const className = this.recipeClassNameSignal();
		if (className === null) {
			return [];
		}
		return this.versionManager.activeVersionData()?.getSchematicsUnlockingRecipe(className) ?? [];
	});

	/** The recipe oscillates in at least one of its machines (a plain machine ignores the figures). */
	protected readonly usesVariablePower = computed<boolean>(() => {
		const recipe = this.recipe();
		return recipe !== null && recipe.producedIn.some(machine => Formulas.usesVariablePower(recipe, machine));
	});

	protected variablePowerBand(recipe: Recipe): PowerDraw
	{
		return Formulas.variablePowerBand(recipe);
	}

	/** A recipe has no icon of its own - its products stand in, as in the recipe list. */
	protected productIcons(recipe: Recipe): (string | null)[]
	{
		return recipe.products.map(product => product.item?.icon ?? null);
	}

	public constructor(private readonly versionManager: VersionManager)
	{
	}

}
