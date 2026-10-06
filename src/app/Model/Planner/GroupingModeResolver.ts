import {Injectable} from '@angular/core';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Injectable({providedIn: 'root'})
export class GroupingModeResolver
{

	public constructor(private readonly settings: SettingsManager)
	{
	}

	public resolve(settings: PlanSettings | null | undefined): GroupingMode
	{
		return settings?.defaultGroupingMode ?? this.settings.planDefaults().groupingMode;
	}

}
