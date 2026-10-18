import {Injectable} from '@angular/core';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {ImportIssueCollector} from '@src/Model/PlanFiles/Conversion/ImportIssueCollector';
import {VersionConversionContext} from '@src/Model/PlanFiles/Conversion/VersionConversionContext';

/**
 * The user's choices carry over; what the target version adds follows its defaults, and values that were the
 * source version's defaults become the target's (untouched resource limits must not freeze at the old numbers).
 * Drops are reported as info: an entry for something that no longer exists cannot change a calculation.
 */
@Injectable({providedIn: 'root'})
export class SettingsVersionConverter
{

	public convert(settings: PlanSettings, context: VersionConversionContext, issues: ImportIssueCollector): PlanSettings
	{
		const target = context.target;
		const dropped = {
			recipes: new Set<string>(),
			buildings: new Set<string>(),
			items: new Set<string>(),
			fuels: new Set<string>(),
		};
		const hasRecipe = (className: string): boolean => this.keep(target.searchRecipeByClassName(className) !== undefined, className, dropped.recipes);
		const hasBuilding = (className: string): boolean => this.keep(target.searchBuildingByClassName(className) !== undefined, className, dropped.buildings);
		const hasItem = (className: string): boolean => this.keep(context.hasItem(className), className, dropped.items);

		const converted: PlanSettings = {
			...settings,
			enabledRecipes: settings.enabledRecipes === undefined ? undefined : this.enabledRecipes(settings.enabledRecipes.filter(hasRecipe), context),
			disabledMachines: settings.disabledMachines?.filter(hasBuilding),
			resourceLimits: settings.resourceLimits === undefined ? undefined : this.resourceLimits(settings.resourceLimits, hasItem, context),
			disabledResources: settings.disabledResources?.filter(hasItem),
			resourceWeights: settings.resourceWeights === undefined
				? undefined
				: Object.fromEntries(Object.entries(settings.resourceWeights).filter(([className]) => hasItem(className))),
			enabledFuels: settings.enabledFuels === undefined ? undefined : this.enabledFuels(settings.enabledFuels, hasBuilding, dropped.fuels, context),
			disabledByproducts: settings.disabledByproducts?.filter(hasItem),
			sinkableItems: settings.sinkableItems?.filter(hasItem),
			recipeClockSpeeds: settings.recipeClockSpeeds?.filter(entry => hasRecipe(entry.recipeClassName)),
			machineClockSpeeds: settings.machineClockSpeeds?.filter(entry => hasBuilding(entry.machineClassName)),
			generatorClockSpeeds: settings.generatorClockSpeeds?.filter(entry => hasBuilding(entry.generatorClassName)),
			// Cosmetic: dropped silently.
			graph: settings.graph?.machineColors === undefined ? settings.graph : {
				...settings.graph,
				machineColors: Object.fromEntries(Object.entries(settings.graph.machineColors)
					.filter(([className]) => target.searchBuildingByClassName(className) !== undefined)),
			},
		};

		this.report(dropped.recipes, 'recipes', className => context.recipeName(className), issues);
		this.report(dropped.buildings, 'buildings', className => context.buildingName(className), issues);
		this.report(dropped.items, 'items', className => context.itemName(className), issues);
		if (dropped.fuels.size > 0) {
			issues.info(`Settings: removed fuels the generators no longer burn: ${[...dropped.fuels].map(className => context.itemName(className)).join(', ')}`);
		}

		// Keys with an undefined value would still be written out and differ from a plan that never had them.
		return Object.fromEntries(Object.entries(converted).filter(([, value]) => value !== undefined)) as unknown as PlanSettings;
	}

	private keep(exists: boolean, className: string, dropped: Set<string>): boolean
	{
		if (!exists) {
			dropped.add(className);
		}
		return exists;
	}

	/** Without the source version every recipe looks old, so nothing is added - the user's list stays as it was. */
	private enabledRecipes(kept: string[], context: VersionConversionContext): string[]
	{
		const source = context.source;
		if (source === null) {
			return kept;
		}
		const added = [...context.targetDefaultRecipes].filter(className =>
			source.searchRecipeByClassName(className) === undefined && !kept.includes(className));
		return [...kept, ...added];
	}

	private resourceLimits(
		limits: Record<string, number>,
		hasItem: (className: string) => boolean,
		context: VersionConversionContext,
	): Record<string, number>
	{
		const sourceDefaults = context.source?.worldLimits ?? null;
		const targetDefaults = context.target.worldLimits ?? {};
		const converted: Record<string, number> = {};
		Object.entries(limits).forEach(([className, limit]) => {
			if (!hasItem(className)) {
				return;
			}
			const wasDefault = sourceDefaults !== null && sourceDefaults[className] !== undefined && !VersionConversionContext.differs(sourceDefaults[className], limit);
			converted[className] = wasDefault && targetDefaults[className] !== undefined ? targetDefaults[className] : limit;
		});
		// An empty record means "unlimited", which a new resource must not quietly turn into a limit.
		if (context.source !== null && Object.keys(limits).length > 0) {
			const sourceResources = new Set(context.source.resources);
			Object.entries(targetDefaults).forEach(([className, limit]) => {
				if (className !== SpecialClasses.WaterItem && !sourceResources.has(className) && converted[className] === undefined) {
					converted[className] = limit;
				}
			});
		}
		return converted;
	}

	private enabledFuels(
		fuels: Record<string, string[]>,
		hasBuilding: (className: string) => boolean,
		droppedFuels: Set<string>,
		context: VersionConversionContext,
	): Record<string, string[]>
	{
		const converted: Record<string, string[]> = {};
		Object.entries(fuels).forEach(([generatorClassName, fuelClassNames]) => {
			if (!hasBuilding(generatorClassName)) {
				return;
			}
			const generator = context.target.getBuildingByClassName(generatorClassName);
			const burnable = new Set(generator.fuel.map(fuel => fuel.item?.className));
			converted[generatorClassName] = fuelClassNames.filter(className => this.keep(burnable.has(className), className, droppedFuels));
		});
		return converted;
	}

	private report(classNames: Set<string>, kind: string, name: (className: string) => string, issues: ImportIssueCollector): void
	{
		if (classNames.size > 0) {
			issues.info(`Settings: removed ${kind} that no longer exist: ${[...classNames].map(name).join(', ')}`);
		}
	}

}
