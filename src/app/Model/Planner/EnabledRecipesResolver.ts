import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';

/**
 * Resolves which recipes a plan's solver may use. Plans without an explicit
 * selection get the default: every non-alternate machine recipe enabled,
 * alternates disabled.
 */
@Injectable({providedIn: 'root'})
export class EnabledRecipesResolver
{

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
		return new Set(data.getRecipesForMachines()
			.filter(recipe => !recipe.alternate)
			.map(recipe => recipe.className));
	}

}
