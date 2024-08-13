import {Component, computed, ChangeDetectionStrategy} from '@angular/core';
import {CodexEntry} from '@src/Components/Codex/CodexEntry';
import {CodexEntryListComponent} from '@src/Components/Codex/CodexEntryListComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'codex-recipes',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './CodexRecipesComponent.html',
	imports: [CodexLinkDirective, CodexEntryListComponent],
})
export class CodexRecipesComponent
{

	// Build-gun recipes are excluded - they are the buildings' build costs,
	// not production recipes.
	protected readonly entries = computed<CodexEntry[]>(() =>
		(this.versionManager.activeVersionData()?.recipes ?? [])
			.filter(recipe => !recipe.inBuildGun)
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(recipe => ({
				link: `recipes/${recipe.className}`,
				icons: recipe.products.map(product => product.item?.icon ?? null),
				name: recipe.name,
			})),
	);

	public constructor(private readonly versionManager: VersionManager)
	{
	}

}
