import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {Data} from '@src/Model/Data/Data';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * Recipe selection for the solver: alternate recipes on the left (disabled
 * by default), standard recipes on the right (enabled by default). One
 * filter searches both lists - recipe-name matches rank before product-name
 * matches.
 */
@Component({
	selector: 'calculator-recipes-tab',
	templateUrl: './CalculatorRecipesTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, GameIconComponent],
})
export class CalculatorRecipesTabComponent
{

	public readonly faChevronRight = faChevronRight;

	public filter = '';

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly resolver: EnabledRecipesResolver,
		public readonly rateFormatter: RateFormatter,
	)
	{
	}

	public get alternateRecipes(): Recipe[]
	{
		return this.filterAndRank(this.machineRecipes().filter(recipe => recipe.alternate));
	}

	public get standardRecipes(): Recipe[]
	{
		return this.filterAndRank(this.machineRecipes().filter(recipe => !recipe.alternate));
	}

	public displayName(recipe: Recipe): string
	{
		return recipe.name.replace(/^Alternate: /, '');
	}

	public isEnabled(recipe: Recipe): boolean
	{
		return this.enabledSet()?.has(recipe.className) ?? false;
	}

	public toggle(recipe: Recipe): void
	{
		const enabled = this.enabledSet();
		if (!enabled) return;
		enabled.has(recipe.className) ? enabled.delete(recipe.className) : enabled.add(recipe.className);
		this.persist(enabled);
	}

	/** All/None act on the currently filtered (visible) list. */
	public setAll(recipes: Recipe[], value: boolean): void
	{
		const enabled = this.enabledSet();
		if (!enabled) return;
		recipes.forEach(recipe => value ? enabled.add(recipe.className) : enabled.delete(recipe.className));
		this.persist(enabled);
	}

	private machineRecipes(): Recipe[]
	{
		const data = this.data();
		if (!data) return [];
		return data.getRecipesForMachines()
			.slice()
			.sort((a, b) => this.displayName(a).localeCompare(this.displayName(b)));
	}

	/**
	 * With a filter, recipes matched by their own name come first, followed
	 * by recipes matched only through a product name.
	 */
	private filterAndRank(recipes: Recipe[]): Recipe[]
	{
		const query = this.filter.trim().toLowerCase();
		if (!query) return recipes;

		const byRecipeName = recipes.filter(recipe => this.displayName(recipe).toLowerCase().includes(query));
		const matched = new Set(byRecipeName.map(recipe => recipe.className));
		const byProductName = recipes.filter(recipe => !matched.has(recipe.className)
			&& recipe.products.some(product => product.item.name.toLowerCase().includes(query)));

		return [...byRecipeName, ...byProductName];
	}

	private enabledSet(): Set<string> | null
	{
		const settings = this.planManager.activeSettings();
		const data = this.data();
		if (!settings || !data) return null;
		return this.resolver.resolve(settings, data);
	}

	private persist(enabled: Set<string>): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		this.planManager.updateActiveSettings({...settings, enabledRecipes: [...enabled].sort()});
	}

	private data(): Data | null
	{
		return this.versionManager.activeVersionData();
	}

}
