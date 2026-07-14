import {Injectable} from '@angular/core';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {Data} from '@src/Model/Data/Data';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';

/**
 * Resolves which items a plan can currently obtain with its enabled
 * selections: raw resources, products of enabled recipes (not disabled by
 * machine), and burn byproducts of enabled generator fuels. Used by the item
 * pickers to strike through or hide everything else (spoiler protection) -
 * a one-step producer check, deliberately shallower than the solver's full
 * reachability analysis.
 */
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

	/**
	 * Convenience for the item pickers: applies the user's unmakeable-items
	 * display mode against the active plan's settings. Options pass through
	 * untouched while the mode is 'show' or no plan context is active.
	 */
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

	/**
	 * Applies the user's unmakeable-items display mode to picker options:
	 * 'show' returns them untouched, 'strike' marks unmakeable options and
	 * moves them to the end, 'hide' drops them. Options that must always be
	 * offered (special targets like Power) are the caller's business - only
	 * pass what may be filtered.
	 */
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
