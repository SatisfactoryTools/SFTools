import {OptimisationSettings} from '@src/Model/Planner/OptimisationSettings';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';

/**
 * Upgrades settings saved by older versions of the planner to the current
 * shape. Applied when plans and folders are read from either store.
 */
export class PlanSettingsNormalizer
{

	/**
	 * Resource weights used to live inside the optimisation settings; they
	 * now belong to the Resources group as `resourceWeights`. A legacy map is
	 * moved up unless the new key is already present.
	 */
	public static normalize(settings: PlanSettings): PlanSettings
	{
		const legacy = settings.optimisation?.resourceWeights;
		if (!legacy) {
			return settings;
		}
		const optimisation: Record<string, unknown> = {...settings.optimisation};
		delete optimisation['resourceWeights'];
		return {
			...settings,
			resourceWeights: settings.resourceWeights ?? legacy,
			optimisation: Object.keys(optimisation).length > 0 ? optimisation as OptimisationSettings : undefined,
		};
	}

}
