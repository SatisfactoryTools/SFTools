import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsGroup} from '@src/Model/Planner/SettingsGroup';

type SettingsKey = keyof PlanSettings;

/** Calculation mode, graph layout and the default grouping mode belong to no group: they stay per plan even under a folder that fixes everything else. */
export class SettingsGroups
{

	public static readonly all: readonly SettingsGroup[] = [
		'recipes', 'machines', 'byproducts', 'resources', 'power', 'sink', 'sloops', 'overclocking', 'optimisation',
	];

	private static readonly keys: Record<SettingsGroup, readonly SettingsKey[]> = {
		recipes: ['enabledRecipes'],
		machines: ['disabledMachines'],
		byproducts: ['disabledByproducts'],
		resources: ['resourceLimits', 'disabledResources', 'resourceWeightMode', 'resourceWeights'],
		power: ['enabledFuels', 'producePowerForFactory', 'excessPowerPercent', 'geothermalGenerators', 'alienPowerAugmenters'],
		sink: ['sinkableItems'],
		sloops: ['maxSloops', 'sloopAccuracy'],
		overclocking: ['defaultClockSpeed', 'recipeClockSpeeds', 'machineClockSpeeds', 'generatorClockSpeeds'],
		optimisation: ['optimisation'],
	};

	private static readonly labels: Record<SettingsGroup, string> = {
		recipes: 'Recipes',
		machines: 'Machines',
		byproducts: 'Byproducts',
		resources: 'Resources',
		power: 'Power',
		sink: 'Sink',
		sloops: 'Sloops',
		overclocking: 'Overclocking',
		optimisation: 'Optimisation',
	};

	public static keysOf(group: SettingsGroup): readonly SettingsKey[]
	{
		return SettingsGroups.keys[group];
	}

	public static labelOf(group: SettingsGroup): string
	{
		return SettingsGroups.labels[group];
	}

	public static apply(target: PlanSettings, source: PlanSettings, groups: readonly SettingsGroup[]): PlanSettings
	{
		const result: Record<string, unknown> = {...target};
		groups.forEach(group => SettingsGroups.keys[group].forEach(key => {
			const value = source[key];
			if (value === undefined) {
				delete result[key];
			} else {
				result[key] = structuredClone(value);
			}
		}));
		return result as unknown as PlanSettings;
	}

	public static differ(a: PlanSettings, b: PlanSettings, groups: readonly SettingsGroup[]): boolean
	{
		return groups.some(group => SettingsGroups.keys[group].some(key =>
			JSON.stringify(a[key] ?? null) !== JSON.stringify(b[key] ?? null)));
	}

}
