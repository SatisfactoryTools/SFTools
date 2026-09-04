import {Injectable} from '@angular/core';
import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {Data} from '@src/Model/Data/Data';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';

/**
 * The small count shown on each production request tab: how much is set up
 * behind it (items requested, recipes enabled of all, overrides…). Null means
 * no badge - either nothing to count for that tab, or the value is the
 * value has nothing to count (folders have no request or inputs).
 */
@Injectable({providedIn: 'root'})
export class CalculatorTabBadgeResolver
{

	public constructor(private readonly enabledRecipes: EnabledRecipesResolver)
	{
	}

	public badge(tab: CalculatorTab, plan: Plan | null, settings: PlanSettings | null, data: Data | null): string | null
	{
		if (!settings) {
			return null;
		}
		switch (tab) {
			case 'request':
				return plan ? this.count(plan.requests.filter(request => request.itemClassName !== '').length) : null;
			case 'input':
				return plan ? this.count(plan.inputs.filter(input => input.itemClassName !== '').length) : null;
			case 'recipes': {
				if (!data) return null;
				const enabled = this.enabledRecipes.resolve(settings, data);
				const recipes = data.getRecipesForMachines();
				return this.ratio(recipes.filter(recipe => enabled.has(recipe.className)).length, recipes.length);
			}
			case 'machines': {
				if (!data) return null;
				const disabled = new Set(settings.disabledMachines ?? []);
				const machines = data.getProductionMachines();
				return this.ratio(machines.filter(machine => !disabled.has(machine.className)).length, machines.length);
			}
			case 'byproducts': {
				if (!data) return null;
				const disabled = new Set(settings.disabledByproducts ?? []);
				const items = data.getAutomatableItems();
				return this.ratio(items.filter(item => !disabled.has(item.className)).length, items.length);
			}
			case 'resources': {
				if (!data) return null;
				// Available = switched on and not capped at zero (unlimited counts).
				const limits = settings.resourceLimits ?? {};
				const disabled = new Set(settings.disabledResources ?? []);
				const available = data.resources.filter(className =>
					!disabled.has(className) && (limits[className] === undefined || limits[className] > 0));
				return this.ratio(available.length, data.resources.length);
			}
			case 'power': {
				if (!data) return null;
				const enabled = settings.enabledFuels ?? {};
				let total = 0;
				let on = 0;
				data.getPowerGenerators().forEach(generator => {
					const fuels = enabled[generator.className] ?? [];
					generator.fuel.forEach(fuel => {
						total++;
						if (fuels.includes(fuel.item.className)) on++;
					});
				});
				return this.ratio(on, total);
			}
			case 'sink': {
				if (!data) return null;
				const sinkable = data.items.filter(item => item.form === ItemForm.Solid && item.sinkPoints > 0);
				return this.ratio(settings.sinkableItems?.length ?? 0, sinkable.length);
			}
			case 'sloops':
				return String(settings.maxSloops ?? 0);
			case 'overclocking': {
				const overrides = (settings.recipeClockSpeeds?.length ?? 0) + (settings.machineClockSpeeds?.length ?? 0);
				const defaultClock = settings.defaultClockSpeed ?? 100;
				return overrides > 0 ? `${defaultClock}% +${overrides}` : `${defaultClock}%`;
			}
			case 'optimisation': {
				const optimisation = settings.optimisation;
				const goals = [
					optimisation?.rawResources ?? true,
					optimisation?.inputs ?? true,
					optimisation?.power ?? true,
					optimisation?.machines ?? false,
				];
				return this.ratio(goals.filter(Boolean).length, goals.length);
			}
			default:
				return null;
		}
	}

	private count(value: number): string
	{
		return String(value);
	}

	private ratio(part: number, total: number): string | null
	{
		return total > 0 ? `${part}/${total}` : null;
	}

}
