import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ResourceConversionRecipeResolver} from '@src/Model/Planner/ResourceConversionRecipeResolver';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/**
 * Resolves which recipes a plan's solver may use. Plans without an explicit
 * selection get the default selection, which the user's plan defaults decide:
 * every standard machine recipe, plus alternate and resource conversion
 * recipes when those are switched on there.
 */
@Injectable({providedIn: 'root'})
export class EnabledRecipesResolver
{

	public constructor(
		private readonly settings: SettingsManager,
		private readonly conversions: ResourceConversionRecipeResolver,
	)
	{
	}

	public resolve(settings: PlanSettings, data: Data): Set<string>
	{
		if (settings.enabledRecipes !== undefined) {
			return new Set(settings.enabledRecipes);
		}
		return this.defaultSelection(data);
	}

	/**
	 * Every machine able to run the recipe is disabled in the Machines tab -
	 * the solver may not use the recipe regardless of its enabled state.
	 */
	public isDisabledByMachine(recipe: Recipe, settings: PlanSettings): boolean
	{
		if (!settings.disabledMachines || settings.disabledMachines.length === 0) {
			return false;
		}
		const disabled = new Set(settings.disabledMachines);
		// Hydration tolerates dangling building references (mods) - skip them.
		const machines = recipe.producedIn.filter(building => building !== undefined);
		return machines.length > 0 && machines.every(building => disabled.has(building.className));
	}

	public defaultSelection(data: Data): Set<string>
	{
		const defaults = this.settings.planDefaults();
		const selection = new Set(data.getRecipesForMachines()
			.filter(recipe => defaults.alternateRecipes || !recipe.alternate)
			.map(recipe => recipe.className));
		if (!defaults.conversionRecipes) {
			this.conversions.resolve(data).forEach(recipe => selection.delete(recipe.className));
		}
		return selection;
	}

}
