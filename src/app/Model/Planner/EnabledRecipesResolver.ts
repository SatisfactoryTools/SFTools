import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
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

	public defaultSelection(data: Data): Set<string>
	{
		return new Set(data.getRecipesForMachines()
			.filter(recipe => !recipe.alternate)
			.map(recipe => recipe.className));
	}

}
