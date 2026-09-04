import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {faChevronRight, faRecycle} from '@fortawesome/free-solid-svg-icons';
import {CollapsibleCardComponent} from '@src/Components/Common/CollapsibleCardComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {Data} from '@src/Model/Data/Data';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {ResourceConversionRecipeResolver} from '@src/Model/Planner/ResourceConversionRecipeResolver';
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
	styles: [`
		.recipe-columns {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.5rem;
			align-items: start;
		}
		@container panel (max-width: 900px) {
			.recipe-columns { grid-template-columns: 1fr; }
		}
	`],
	imports: [FaIconComponent, FormsModule, GameIconComponent, TooltipDirective, InfoNoteComponent, CollapsibleCardComponent],
})
export class CalculatorRecipesTabComponent
{

	public readonly faChevronRight = faChevronRight;
	public readonly faRecycle = faRecycle;

	public filter = '';
	public alternateOpen = true;
	public standardOpen = true;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly resolver: EnabledRecipesResolver,
		private readonly conversions: ResourceConversionRecipeResolver,
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

	/** The Converter's raw-resource conversion recipes of this version; empty hides the group button. */
	public get conversionRecipes(): Recipe[]
	{
		const data = this.data();
		return data ? this.conversions.resolve(data) : [];
	}

	/** Every conversion recipe is off - the group button offers to switch them back on. */
	public get conversionsAllDisabled(): boolean
	{
		const enabled = this.enabledSet();
		return enabled !== null && this.conversionRecipes.every(recipe => !enabled.has(recipe.className));
	}

	public get conversionTooltip(): string
	{
		const count = this.conversionRecipes.length;
		return `${count} standard Converter recipe${count === 1 ? '' : 's'} turning one raw resource plus Reanimated SAM into another raw resource`;
	}

	/** Switches the whole conversion group off, or back on once every recipe of it is off. */
	public toggleConversions(): void
	{
		this.setAll(this.conversionRecipes, this.conversionsAllDisabled);
	}

	public displayName(recipe: Recipe): string
	{
		return recipe.name.replace(/^Alternate: /, '');
	}

	public isEnabled(recipe: Recipe): boolean
	{
		return this.enabledSet()?.has(recipe.className) ?? false;
	}

	/** The recipe's every machine is disabled in the Machines tab - the solver ignores it. */
	public isMachineDisabled(recipe: Recipe): boolean
	{
		const settings = this.planManager.activeSettings();
		return settings !== null && this.resolver.isDisabledByMachine(recipe, settings);
	}

	public machineDisabledTitle(recipe: Recipe): string
	{
		if (!this.isMachineDisabled(recipe)) {
			return '';
		}
		const names = recipe.producedIn.filter(building => building !== undefined).map(building => building.name);
		return `Not available to the solver - ${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} disabled in the Machines tab`;
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
