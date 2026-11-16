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
		resources: ['resourceLimits', 'disabledResources', 'resourceWeightMode', 'resourceWeights', 'resourceArea', 'mapConveyors'],
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

	/**
	 * Subplans saved before parent groups existed share the parent's raw resources only. Their sloops stay their own:
	 * their parents never had a budget for them, so sharing would take the sloops they already use away.
	 */
	public static readonly legacyParentGroups: readonly SettingsGroup[] = ['resources'];

	public static parentGroupsOf(plan: {parentPlanId: string | null; settings: PlanSettings}): readonly SettingsGroup[]
	{
		if (plan.parentPlanId === null) {
			return [];
		}
		return plan.settings.parentGroups ?? SettingsGroups.legacyParentGroups;
	}

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

	/** Like apply, but a subplan never takes the parent's geysers and augmenters: copying them would build them twice. */
	public static applyFromParent(target: PlanSettings, parent: PlanSettings, groups: readonly SettingsGroup[]): PlanSettings
	{
		const result: Record<string, unknown> = {...target};
		SettingsGroups.parentKeys(groups).forEach(key => {
			const value = parent[key];
			if (value === undefined) {
				delete result[key];
			} else {
				result[key] = structuredClone(value);
			}
		});
		return result as unknown as PlanSettings;
	}

	public static differFromParent(child: PlanSettings, parent: PlanSettings, groups: readonly SettingsGroup[]): boolean
	{
		return SettingsGroups.parentKeys(groups).some(key => JSON.stringify(child[key] ?? null) !== JSON.stringify(parent[key] ?? null));
	}

	private static parentKeys(groups: readonly SettingsGroup[]): SettingsKey[]
	{
		return groups.flatMap(group => SettingsGroups.keys[group])
			.filter(key => !SettingsGroups.ownBuildKeys.includes(key));
	}

	private static readonly ownBuildKeys: readonly SettingsKey[] = ['geothermalGenerators', 'alienPowerAugmenters'];

}
