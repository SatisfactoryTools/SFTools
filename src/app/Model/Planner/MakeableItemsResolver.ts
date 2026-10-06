import {Injectable} from '@angular/core';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {Data} from '@src/Model/Data/Data';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';

/** A one-step producer check, deliberately shallower than the solver's full reachability analysis. */
@Injectable({providedIn: 'root'})
export class MakeableItemsResolver
{

	public constructor(
		private readonly enabledRecipes: EnabledRecipesResolver,
		private readonly settingsManager: SettingsManager,
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
	)
	{
	}

	public applyToActivePlan(options: ItemPickerOption[]): ItemPickerOption[]
	{
		const display = this.settingsManager.planner().unmakeableItems;
		if (display === 'show') {
			return options;
		}
		const data = this.versionManager.activeVersionData();
		const settings = this.planManager.activeSettings();
		if (!data || !settings) {
			return options;
		}
		return this.applyDisplay(options, this.resolve(settings, data), display);
	}

	public resolve(settings: PlanSettings, data: Data): Set<string>
	{
		const makeable = new Set<string>(data.resources);

		const enabled = this.enabledRecipes.resolve(settings, data);
		data.getRecipesForMachines().forEach(recipe => {
			if (!enabled.has(recipe.className) || this.enabledRecipes.isDisabledByMachine(recipe, settings)) {
				return;
			}
			recipe.products.forEach(product => {
				// Hydration tolerates dangling item references (mods) - skip them.
				if (product.item) {
					makeable.add(product.item.className);
				}
			});
		});

		Object.entries(settings.enabledFuels ?? {}).forEach(([generatorClassName, fuelClassNames]) => {
			const generator = data.searchBuildingByClassName(generatorClassName);
			generator?.fuel.forEach(fuel => {
				if (fuel.item && fuel.byproduct && fuelClassNames.includes(fuel.item.className)) {
					makeable.add(fuel.byproduct.className);
				}
			});
		});

		return makeable;
	}

	public applyDisplay(options: ItemPickerOption[], makeable: Set<string>, display: UnmakeableItemsDisplay): ItemPickerOption[]
	{
		if (display === 'show') {
			return options;
		}
		if (display === 'hide') {
			return options.filter(option => makeable.has(option.value));
		}
		return [
			...options.filter(option => makeable.has(option.value)),
			...options.filter(option => !makeable.has(option.value)).map(option => ({...option, strike: true})),
		];
	}

}
