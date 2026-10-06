import {OptimisationSettings} from '@src/Model/Planner/OptimisationSettings';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';

export class PlanSettingsNormalizer
{

	/** Resource weights used to live inside the optimisation settings. */
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
