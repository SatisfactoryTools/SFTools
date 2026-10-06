import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {Building} from '@src/Model/Data/Entities/Building';
import {SaveFileUnlocks} from '@src/Model/SaveFile/SaveFileUnlocks';
import {SaveSettingsMapResult} from '@src/Model/SaveFile/SaveSettingsMapResult';

@Injectable({providedIn: 'root'})
export class SaveSettingsMapper
{

	public map(unlocks: SaveFileUnlocks, data: Data): SaveSettingsMapResult
	{
		let unknownEntries = 0;
		const unlockedRecipes = new Set<string>();

		unlocks.recipes.forEach(className => {
			if (data.searchRecipeByClassName(className)) {
				unlockedRecipes.add(className);
			} else {
				unknownEntries++;
			}
		});

		// The recipe manager already lists what the schematics unlocked, but a save may carry only one of the two managers.
		unlocks.schematics.forEach(className => {
			const schematic = data.searchSchematicByClassName(className);
			if (!schematic) {
				unknownEntries++;
				return;
			}
			schematic.unlock.recipes.forEach(recipe => {
				// Hydration tolerates dangling recipe references (mods) - skip them.
				if (recipe) {
					unlockedRecipes.add(recipe.className);
				}
			});
		});

		const machines = data.getProductionMachines();
		const disabledMachines = machines
			.filter(machine => !this.isBuildingUnlocked(machine, data, unlockedRecipes))
			.map(machine => machine.className)
			.sort();

		const machineRecipes = data.getRecipesForMachines();
		const enabledRecipes = machineRecipes
			.filter(recipe => unlockedRecipes.has(recipe.className))
			.map(recipe => recipe.className)
			.sort();

		const sourceableItems = this.resolveSourceableItems(data, unlockedRecipes);
		const generators = data.getPowerGenerators();
		const enabledFuels: Record<string, string[]> = {};
		generators.forEach(generator => {
			if (!this.isBuildingUnlocked(generator, data, unlockedRecipes)) {
				return;
			}
			const fuels = [...new Set(generator.fuel
				.filter(fuel => fuel.item && sourceableItems.has(fuel.item.className))
				.map(fuel => fuel.item.className))].sort();
			if (fuels.length > 0) {
				enabledFuels[generator.className] = fuels;
			}
		});

		return {
			enabledRecipes,
			disabledMachines: disabledMachines.length > 0 ? disabledMachines : undefined,
			enabledFuels: Object.keys(enabledFuels).length > 0 ? enabledFuels : undefined,
			summary: {
				sessionName: unlocks.sessionName,
				machinesEnabled: machines.length - disabledMachines.length,
				machinesTotal: machines.length,
				recipesEnabled: enabledRecipes.length,
				recipesTotal: machineRecipes.length,
				generatorsEnabled: Object.keys(enabledFuels).length,
				generatorsTotal: generators.length,
				unknownEntries,
			},
		};
	}

	/** A building whose build recipe is missing from the dataset cannot be checked - treat it as unlocked. */
	private isBuildingUnlocked(building: Building, data: Data, unlockedRecipes: Set<string>): boolean
	{
		const buildRecipe = data.searchBuildRecipeForBuilding(building.className);
		return buildRecipe === undefined || unlockedRecipes.has(buildRecipe.className);
	}

	private resolveSourceableItems(data: Data, unlockedRecipes: Set<string>): Set<string>
	{
		const sourceable = new Set<string>(data.resources);
		data.getRecipesForMachines().forEach(recipe => {
			if (!unlockedRecipes.has(recipe.className)) {
				return;
			}
			recipe.products.forEach(product => {
				if (product.item) {
					sourceable.add(product.item.className);
				}
			});
		});
		return sourceable;
	}

}
