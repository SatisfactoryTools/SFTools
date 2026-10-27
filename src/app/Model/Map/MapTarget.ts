import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';

export class MapTarget
{

	private constructor(
		public readonly plan: Plan | null,
		public readonly folder: Folder | null,
	)
	{
	}

	public static ofPlan(plan: Plan): MapTarget
	{
		return new MapTarget(plan, null);
	}

	public static ofFolder(folder: Folder): MapTarget
	{
		return new MapTarget(null, folder);
	}

	/** A folder without its own settings has none: its plans use the defaults. */
	public get settings(): PlanSettings | null
	{
		return this.plan?.settings ?? this.folder?.settings ?? null;
	}

}
