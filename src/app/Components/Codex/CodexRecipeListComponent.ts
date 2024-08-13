import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {CodexRecipeComponent} from '@src/Components/Codex/CodexRecipeComponent';
import {Recipe} from '@src/Model/Data/Entities/Recipe';

/**
 * Full recipes as an aligned table (ingredients, products and machines each
 * in their own column) - drop into a flush codex-section. Also renders a
 * single recipe (the detail page passes `[recipes]="[recipe]"` without names).
 */
@Component({
	selector: 'codex-recipe-list',
	templateUrl: './CodexRecipeListComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexRecipeComponent],
})
export class CodexRecipeListComponent
{

	@Input({required: true}) public recipes: Recipe[] = [];
	@Input() public showNames = true;

}
