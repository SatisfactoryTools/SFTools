import {Component, ChangeDetectionStrategy, Input, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {CodexRecipeListComponent} from '@src/Components/Codex/CodexRecipeListComponent';
import {CodexSchematicListComponent} from '@src/Components/Codex/CodexSchematicListComponent';
import {CodexSectionComponent} from '@src/Components/Codex/CodexSectionComponent';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {Schematic} from '@src/Model/Data/Entities/Schematic';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {RateFormatter} from '@src/Model/RateFormatter';

@Component({
	selector: 'codex-recipe-detail',
	templateUrl: './CodexRecipeDetailComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		CodexLinkDirective,
		CodexRecipeListComponent,
		CodexSchematicListComponent,
		CodexSectionComponent,
		FaIconComponent,
	],
})
export class CodexRecipeDetailComponent
{

	public readonly faChevronLeft = faChevronLeft;

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

	protected variablePowerRange(recipe: Recipe): string
	{
		const min = recipe.variablePowerDrawConstant;
		const max = recipe.variablePowerDrawConstant + recipe.variablePowerDrawFactor;
		return `${this.formatter.power(min)} – ${this.formatter.power(max)}`;
	}

	public constructor(
		private readonly versionManager: VersionManager,
		protected readonly formatter: RateFormatter,
	)
	{
	}

}
